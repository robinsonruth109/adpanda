'use client';
import {useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowUpRight,Check,CheckCircle2,ChevronDown,ChevronUp,Clock3,MapPin,Package,Search,ShieldCheck,ShoppingBag,Store,Wallet,XCircle} from 'lucide-react';
import AdminKitchenPin from './admin-kitchen-pin';
import {storeTypeContent,storeTypes,type MarketplaceType} from '@/lib/store-types';

type StoreData={
 id:string;name:string;storeType:MarketplaceType;address:string;latitude:number;longitude:number;
 commissionRate:number|null;products:number;orders:number;delivered:number;deliveredSales:number;
 bookedCommission:number;active:boolean;createdAt:string;
};
type MerchantData={id:string;name:string;status:string;owner:string;phone:string;createdAt:string;kitchens:StoreData[]};
type Action='APPROVE'|'REJECT'|'SUSPEND'|'SAVE_COMMISSION';
const money=(amount:number)=>'৳'+amount.toLocaleString('en-BD',{minimumFractionDigits:2,maximumFractionDigits:2});

export default function MerchantReviews({merchants:initial}:{merchants:MerchantData[]}){
 const router=useRouter();
 const [merchants,setMerchants]=useState(initial);
 const [query,setQuery]=useState('');
 const [statusFilter,setStatusFilter]=useState('ALL');
 const [typeFilter,setTypeFilter]=useState<MarketplaceType|'ALL'>('ALL');
 const [rates,setRates]=useState<Record<string,string>>({});
 const [openedMap,setOpenedMap]=useState<string|null>(null);
 const [busy,setBusy]=useState<string|null>(null);
 const [notice,setNotice]=useState<{text:string;error:boolean}|null>(null);
 const rows=useMemo(()=>merchants.flatMap(m=>m.kitchens.map(k=>({...k,merchant:m}))),[merchants]);
 const countByType=(type:MarketplaceType)=>rows.filter(r=>r.storeType===type).length;
 const visible=useMemo(()=>rows.filter(row=>{
  const matchType=typeFilter==='ALL'||row.storeType===typeFilter;
  const matchStatus=statusFilter==='ALL'||row.merchant.status===statusFilter;
  const needle=query.trim().toLocaleLowerCase();
  return matchType&&matchStatus&&(!needle||
   [row.name,row.merchant.name,row.merchant.owner,row.merchant.phone,row.address].join(' ').toLocaleLowerCase().includes(needle)
  );
 }),[rows,typeFilter,statusFilter,query]);
 const sections=typeFilter==='ALL'?storeTypes:[typeFilter];

 async function apply(row:typeof rows[number],action:Action){
  if(busy)return;
  const {merchant}=row;
  if(action==='APPROVE'&&merchant.status==='APPROVED')return;
  if(action==='REJECT'&&merchant.status==='APPROVED')return;
  if(action==='SAVE_COMMISSION'&&merchant.status!=='APPROVED')return;
  const rate=Number(rates[row.id]??row.commissionRate??10);
  if(!Number.isFinite(rate)||rate<0||rate>100){setNotice({text:'Commission rate must be between 0% and 100%.',error:true});return}
  if(action==='APPROVE'&&!window.confirm('Have you verified the shop entrance location and owner? Approving enables all shops belonging to this merchant account.'))return;
  if(action==='REJECT'&&!window.confirm('Reject this pending merchant application?'))return;
  if(action==='SUSPEND'&&!window.confirm('Suspend this merchant and pause all linked shops?'))return;
  setBusy(row.id+action);setNotice(null);
  try{
   const r=await fetch('/api/admin/merchants/'+encodeURIComponent(merchant.id),{
    method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action,commissionRate:rate,kitchenId:action==='SAVE_COMMISSION'?row.id:undefined})
   });
   const result=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(result.error||'Merchant update unsuccessful');
   const nextStatus=action==='SAVE_COMMISSION'?merchant.status:result.status;
   setMerchants(prev=>prev.map(m=>m.id===merchant.id?{
    ...m,status:nextStatus,
    kitchens:m.kitchens.map(k=>({
     ...k,
     commissionRate:action==='SAVE_COMMISSION'?(k.id===row.id?rate:k.commissionRate):rate,
     active:action==='SAVE_COMMISSION'?k.active:action==='APPROVE'
    }))
   }:m));
   setNotice({text:action==='SAVE_COMMISSION'?row.name+' commission saved at '+rate+'%.':merchant.name+' status updated: '+nextStatus+'.',error:false});
   router.refresh();
  }catch(err){setNotice({text:err instanceof Error?err.message:'Could not update merchant.',error:true})}
  finally{setBusy(null)}
 }

 return <div className="adp-merchant-manager">
  <div className="adp-merchant-type-tabs" role="group" aria-label="Browse merchants by shop type">
   <button type="button" onClick={()=>setTypeFilter('ALL')} aria-pressed={typeFilter==='ALL'} className={typeFilter==='ALL'?'selected':''}>🏪 All shops <b>{rows.length}</b></button>
   {storeTypes.map(t=><button type="button" key={t} className={typeFilter===t?'selected':''}
    onClick={()=>setTypeFilter(t)} aria-pressed={typeFilter===t}>
    {storeTypeContent[t].emoji} {storeTypeContent[t].name} <b>{countByType(t)}</b>
   </button>)}
  </div>
  <div className="adp-merchant-searchbar">
   <div className="adp-merchant-search-input"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search shop, merchant, owner or mobile number…" aria-label="Search merchants"/></div>
   <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} aria-label="Filter merchant status">
    <option value="ALL">All statuses</option><option value="PENDING">Pending approval</option>
    <option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="SUSPENDED">Suspended</option>
   </select>
  </div>
  {notice&&<div className={'adp-merchant-feedback '+(notice.error?'error':'success')} role="status">
   {notice.error?<XCircle size={17}/>:<CheckCircle2 size={17}/>} {notice.text}
  </div>}
  {sections.map(type=>{
   const group=visible.filter(r=>r.storeType===type);
   return <section className="adp-merchant-type-section" key={type} aria-label={storeTypeContent[type].name}>
    <div className="adp-merchant-group-heading"><div className={'adp-merchant-group-icon '+type.toLowerCase()}>{storeTypeContent[type].emoji}</div>
     <div><h2>{storeTypeContent[type].name}</h2><p>{storeTypeContent[type].bn} · {storeTypeContent[type].singular} partners</p></div>
     <span className="adp-merchant-group-count">{group.length} {group.length===1?'shop':'shops'}</span>
    </div>
    {group.length>0?<div className="adp-merchant-card-grid">
     {group.map(row=>{
      const m=row.merchant,rate=rates[row.id]??String(row.commissionRate??10);
      const approved=m.status==='APPROVED';
      const pending=m.status==='PENDING';
      const working=busy!==null;
      const editChanged=Number(rate)!==(row.commissionRate??10);
      return <article key={row.id} className={'adp-merchant-card '+type.toLowerCase()}>
       <div className="adp-merchant-card-head">
        <div className={'adp-merchant-card-symbol '+type.toLowerCase()}>{storeTypeContent[type].emoji}</div>
        <div className="adp-merchant-card-title"><h3>{row.name}</h3>
         <span><Store size={13}/>{m.name}</span>
        </div>
        <span className={'merchant-status '+m.status.toLowerCase()}>{m.status}</span>
       </div>
       <div className="adp-merchant-card-owner">
        <div><small>STORE OWNER</small><strong>{m.owner}</strong></div>
        <div><small>PHONE</small><a href={'tel:'+m.phone}>{m.phone}</a></div>
       </div>
       <div className="adp-merchant-card-metrics">
        <div><Package size={15}/><small>Products</small><strong>{row.products}</strong></div>
        <div><ShoppingBag size={15}/><small>Orders</small><strong>{row.orders}</strong></div>
        <div><CheckCircle2 size={15}/><small>Delivered</small><strong>{row.delivered}</strong></div>
       </div>
       <div className="adp-merchant-card-finance">
        <span><small>Delivered product sales</small><strong>{money(row.deliveredSales)}</strong></span>
        <span><small>Booked commission</small><strong>{money(row.bookedCommission)}</strong></span>
       </div>
       <div className="adp-merchant-card-address"><MapPin size={17}/><div>
        <span>{row.address}</span>
        <a href={'https://www.google.com/maps?q='+row.latitude+','+row.longitude} target="_blank" rel="noopener noreferrer">
         Verify shop location <ArrowUpRight size={14}/>
        </a>
       </div></div>
       {!approved&&<div className="adp-merchant-map-panel">
        <button type="button" className="adp-merchant-map-toggle" onClick={()=>setOpenedMap(v=>v===row.id?null:row.id)}>
         <MapPin size={16}/>{openedMap===row.id?'Close map verification':'Open map pin verification'}
         {openedMap===row.id?<ChevronUp size={16}/>:<ChevronDown size={16}/>}
        </button>
        {openedMap===row.id&&<AdminKitchenPin id={row.id} latitude={row.latitude} longitude={row.longitude}/>}
       </div>}
       <div className="adp-merchant-card-commission">
        <div><span><Wallet size={16}/> Shop commission</span><small>Rate applies to this shop</small></div>
        <div className="adp-merchant-commission-control">
         <label className="adp-merchant-rate-input"><input type="number" value={rate} min="0" max="100" step="0.01"
          aria-label={row.name+' commission percentage'} onChange={e=>setRates(s=>({...s,[row.id]:e.target.value}))}/><span>%</span></label>
         <button type="button" className="adp-merchant-save-rate" disabled={!approved||working||!editChanged}
          onClick={()=>void apply(row,'SAVE_COMMISSION')}>Save rate</button>
        </div>
       </div>
       <div className="adp-merchant-card-actions">
        <button type="button" className="adp-merchant-approve" disabled={approved||working}
         onClick={()=>void apply(row,'APPROVE')}>{approved?<><Check size={16}/> Already approved</>:pending?<><ShieldCheck size={16}/> Approve shop</>:<><Check size={16}/> Re-approve</>}</button>
        {pending&&<button type="button" className="adp-merchant-action-neutral" disabled={working}
          onClick={()=>void apply(row,'REJECT')}>Reject</button>}
        {approved&&<button type="button" className="adp-merchant-action-danger" disabled={working}
          onClick={()=>void apply(row,'SUSPEND')}>Suspend</button>}
        {!pending&&!approved&&<span className="adp-merchant-state-note"><Clock3 size={14}/> {m.status.toLowerCase()}</span>}
       </div>
      </article>
     })}
    </div>:<div className="adp-merchant-group-empty"><Store size={22}/><span>{query||statusFilter!=='ALL'?'No matching shops in this category.':'No '+storeTypeContent[type].name.toLowerCase()+' merchants yet.'}</span></div>}
   </section>
  })}
 </div>;
}
