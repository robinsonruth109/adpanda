'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowUpRight,Check,MapPin,ShieldCheck,X} from 'lucide-react';
import {storeTypeContent,type MarketplaceType} from '@/lib/store-types';
type Pending={id:string;name:string;owner:string;phone:string;shops:{id:string;name:string;type:MarketplaceType;address:string;latitude:number;longitude:number}[]};
export default function AdminPendingQueue({applications}:{applications:Pending[]}){
 const router=useRouter();
 const [items,setItems]=useState(applications);
 const [rates,setRates]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState<string|null>(null);
 const [error,setError]=useState('');
 async function act(id:string,action:'APPROVE'|'REJECT'){
  if(busy)return;
  if(!window.confirm(action==='APPROVE'?'Verify owner and the exact shop pin before approving all merchant shops. Continue?':'Reject this pending application?'))return;
  const rate=Number(rates[id]??10);
  if(!Number.isFinite(rate)||rate<0||rate>100){setError('Commission must be 0–100%');return}
  setBusy(id);setError('');
  try{
   const response=await fetch('/api/admin/merchants/'+encodeURIComponent(id),{
    method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action,commissionRate:rate})
   });
   const body=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(body.error||'Review failed');
   setItems(p=>p.filter(x=>x.id!==id));
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:'Unable to review merchant')}
  finally{setBusy(null)}
 }
 return <div className="adp-admin-pending-queue">
  {error&&<p role="alert" className="adp-merchant-feedback error">{error}</p>}
  {items.map(m=><article key={m.id} className="adp-admin-pending-row">
   <div><strong>{m.name}</strong><small>{m.owner} · {m.phone}</small>
    {m.shops.map(k=><span className="adp-admin-pending-location" key={k.id}>
     {storeTypeContent[k.type].emoji} {k.name} · {k.address}
     <a target="_blank" rel="noopener noreferrer" href={'https://www.google.com/maps?q='+k.latitude+','+k.longitude}>Verify pin <ArrowUpRight size={12}/></a>
    </span>)}
   </div>
   <div className="adp-admin-pending-controls">
    <label>Commission <span><input aria-label={m.name+' initial commission percent'} type="number" min="0" max="100" step=".01" value={rates[m.id]??'10'} onChange={e=>setRates(s=>({...s,[m.id]:e.target.value}))}/>%</span></label>
    <button className="adp-admin-pending-approve" type="button" disabled={busy!==null} onClick={()=>void act(m.id,'APPROVE')}><Check size={15}/> Approve</button>
    <button className="adp-admin-pending-reject" type="button" disabled={busy!==null} onClick={()=>void act(m.id,'REJECT')}><X size={15}/> Reject</button>
   </div>
  </article>)}
  {items.length===0&&<p className="adp-admin-no-pending"><ShieldCheck size={18}/> All applications reviewed.</p>}
  <Link className="adp-admin-pending-see-all" href="/admin/merchants">Manage all merchants <ArrowUpRight size={16}/></Link>
 </div>;
}
