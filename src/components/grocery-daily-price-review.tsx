'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {BadgeCheck,Check,ClipboardCheck,Clock3,Search,Store, X,AlertTriangle,RefreshCcw,ShieldCheck} from 'lucide-react';

type Product={id:string;name:string;price:string;unitLabel:string;stockQty:number|null;available:boolean;category:string};
type Response={name:string;date:string;catalogVersion:number;alreadyVerified:boolean;lastVerifiedAt:string|null;items:Product[]};
type Props={storeId:string;name:string;required:boolean};

export default function GroceryDailyPriceReview({storeId,name,required}:Props){
 const router=useRouter();
 const [show,setShow]=useState(required);
 const [data,setData]=useState<Response|null>(null);
 const [priceEdits,setPriceEdits]=useState<Record<string,string>>({});
 const [reviewed,setReviewed]=useState<Record<string,boolean>>({});
 const [search,setSearch]=useState('');
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[notice,setNotice]=useState('');
 const [todayVerified,setTodayVerified]=useState(!required);

 const load=useCallback(async()=>{
  setLoading(true);setNotice('');
  try{
   const res=await fetch('/api/merchant/kitchens/'+encodeURIComponent(storeId)+'/price-review',{cache:'no-store',credentials:'same-origin'});
   const body=await res.json();
   if(!res.ok)throw Error(body.error||'দামের তালিকা আনা যায়নি');
   const details=body as Response;
   setData(details);
   setPriceEdits(Object.fromEntries(details.items.map(item=>[item.id,item.price])));
   setReviewed({});
   setTodayVerified(details.alreadyVerified);
  }catch(e){setNotice(e instanceof Error?e.message:'Price review failed')}
  finally{setLoading(false)}
 },[storeId]);
 useEffect(()=>{if(show)void load()},[show,load]);
 useEffect(()=>{if(required){setShow(true);setTodayVerified(false)}},[required,storeId]);

 // Server rejects stale signoffs immediately at midnight; refresh the UI state when
 // the merchant leaves the tab open across a new Bangladesh day.
 useEffect(()=>{
  const refresh=async()=>{
   if(document.visibilityState!=='visible')return;
   try{
    const r=await fetch('/api/merchant/kitchens/'+encodeURIComponent(storeId)+'/price-review',{cache:'no-store'});
    if(!r.ok)return;
    const fresh=await r.json() as Response;
    if(!fresh.alreadyVerified){
     if(todayVerified){setTodayVerified(false);setShow(true);router.refresh()}
    }else setTodayVerified(true);
   }catch{}
  };
  const timer=window.setInterval(()=>{void refresh()},60000);
  return()=>window.clearInterval(timer);
 },[storeId,todayVerified,router]);

 const products=data?.items||[];
 const count=products.reduce((sum,item)=>sum+(reviewed[item.id]?1:0),0);
 const progress=products.length?Math.round(count/products.length*100):0;
 const visible=useMemo(()=>products.filter(item=>[item.name,item.category,item.unitLabel].join(' ').toLowerCase().includes(search.toLowerCase())),[products,search]);
 const changed=products.filter(item=>priceEdits[item.id]!==item.price);
 const ready=products.length>0&&count===products.length;

 function change(id:string,value:string){
  setPriceEdits(p=>({...p,[id]:value}));
  setReviewed(p=>({...p,[id]:false}));
  setNotice('');
 }
 function mark(id:string,value:boolean){setReviewed(p=>({...p,[id]:value}))}

 async function confirm(){
  if(!data||!ready||busy)return;
  const invalid=products.find(p=>{
   const price=priceEdits[p.id]||'';
   return !/^(?:0|[1-9]\d{0,5})(?:\.\d{1,2})?$/.test(price)||Number(price)<=0||Number(price)>100000;
  });
  if(invalid){setNotice(invalid.name+'-এর নতুন দাম সঠিকভাবে লিখুন (e.g. 85.00)');return}
  setBusy(true);setNotice('');
  try{
   const res=await fetch('/api/merchant/kitchens/'+encodeURIComponent(storeId)+'/price-review',{
    method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',
    body:JSON.stringify({catalogVersion:data.catalogVersion,items:products.map(item=>({
     id:item.id,price:priceEdits[item.id],acknowledged:reviewed[item.id]===true
    }))})
   });
   const result=await res.json();
   if(!res.ok)throw Error(result.error||'দাম verify করা যায়নি');
   setNotice(result.message||'সব পণ্যের দাম যাচাই হয়েছে।');
   setTodayVerified(true);setShow(false);router.refresh();
  }catch(e){await load();setNotice(e instanceof Error?e.message:'Verification failed')}
  finally{setBusy(false)}
 }

 return <>
  <div className={'grocery-daily-alert'+(!todayVerified?' needs-review':' verified')}>
   <span className="grocery-daily-alert-icon">{todayVerified?<BadgeCheck size={20}/>:<AlertTriangle size={20}/>}</span>
   <div><strong>{todayVerified?'আজকের Grocery দাম Verified ✓':'আজকের Grocery দাম যাচাই বাকি'}</strong>
    <small>{todayVerified?'দোকানের পণ্য ও দাম আজ যাচাই করা হয়েছে।':'Shop open করার আগে সব পণ্যের দাম মিলিয়ে Confirm করুন। ততক্ষণ order নেওয়া বন্ধ থাকবে।'}</small></div>
   <button type="button" onClick={()=>setShow(true)}>{todayVerified?'Recheck prices':'Verify prices now'}</button>
  </div>

  {show&&<div className="grocery-review-overlay">
   <section className="grocery-review-dialog" role="dialog" aria-modal="true" aria-labelledby="grocery-review-title">
    <header className="grocery-review-head">
     <div className="grocery-review-identity"><span><ClipboardCheck size={27}/></span><div>
      <small>ADPANDA · DAILY GROCERY PRICE CHECK</small>
      <h2 id="grocery-review-title">আজকের পণ্যের দাম যাচাই করুন</h2>
      <p>{name} · Shop খুলতে আজকের সব পণ্যের price confirm করতে হবে।</p>
     </div></div>
     <button type="button" aria-label="Close daily price review (shop will remain closed)" onClick={()=>setShow(false)}><X size={22}/></button>
    </header>
    <div className="grocery-review-toolbar">
     <div><span className="grocery-review-date"><Clock3 size={16}/> {data?.date||'Bangladesh time (Asia/Dhaka)'}</span><strong>{count}/{products.length} Reviewed</strong></div>
     <div className="grocery-review-progress"><span style={{width:progress+'%'}}/></div>
     <p>প্রতিটি পণ্যের বর্তমান দাম মিলিয়ে checkbox টিক দিন। নতুন দাম হলে BDT amount edit করে আবার Review করুন। Out-of-stock products-ও review করতে হবে।</p>
    </div>
    <div className="grocery-review-content">
     {loading?<div className="grocery-review-empty"><RefreshCcw size={26}/> দাম ও পণ্যের তালিকা আনা হচ্ছে…</div>:!data?<div className="grocery-review-empty">তালিকা আনা যায়নি। <button type="button" onClick={()=>void load()}>Retry</button></div>:
      !products.length?<div className="grocery-review-empty"><Store size={31}/><h3>এখনও কোনো Grocery Product নেই</h3><p>দোকান খোলার আগে প্রথমে Category ও Product যোগ করুন।</p><Link href="/merchant/menu" onClick={()=>setShow(false)}>Go to Product Management</Link></div>:<>
       <div className="grocery-review-search"><Search size={18}/><input aria-label="Find a product to verify" placeholder="Search product / পণ্য খুঁজুন…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <button type="button" onClick={()=>void load()} title="Refresh products" aria-label="Refresh product list"><RefreshCcw size={17}/></button>
       </div>
       <div className="grocery-review-list">
       {visible.map(item=><article key={item.id} className={'grocery-review-item'+(reviewed[item.id]?' done':'')}>
        <div className="grocery-review-item-main"><small>{item.category} · {item.unitLabel}</small><strong>{item.name}</strong><span className={item.available?'':'soldout'}>{item.stockQty===null?'Stock untracked':'Stock '+item.stockQty}{!item.available?' · Sold out':''}</span></div>
        <div className="grocery-review-pricing"><label>আগের দাম / Price (৳)<input inputMode="decimal" type="text" value={priceEdits[item.id]??item.price} onChange={e=>change(item.id,e.target.value)} aria-label={item.name+" today's price in BDT"}/></label>
          {priceEdits[item.id]!==item.price&&<small>Previous ৳{item.price} → New ৳{priceEdits[item.id]}</small>}
        </div>
        <label className="grocery-review-check"><input type="checkbox" checked={reviewed[item.id]||false} onChange={e=>mark(item.id,e.target.checked)}/><span>{reviewed[item.id]?<Check size={16}/>:<ShieldCheck size={16}/>} Verified</span></label>
       </article>)}
       {!visible.length&&<div className="grocery-review-empty">No matching product.</div>}
       </div></>}
    </div>
    <footer className="grocery-review-foot">
     <div><strong>{products.length?count+' of '+products.length+' reviewed':'No products yet'} · {changed.length} price change(s)</strong>
      <small>Verification stores who checked, date, old and new prices in Admin audit logs.</small>
      {notice&&<p role="alert">{notice}</p>}
     </div>
     <button type="button" className="grocery-review-confirm" disabled={!ready||busy||loading} onClick={()=>void confirm()}>
      <Check size={17}/> {busy?'Saving…':ready?'Confirm all prices for today':'Verify every product first'}
     </button>
    </footer>
   </section>
  </div>}
 </>;
}
