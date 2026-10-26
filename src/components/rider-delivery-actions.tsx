'use client';
import {useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
export default function RiderDeliveryActions({orderId,status,merchantPayable,settlement}:{orderId:string;status:string;merchantPayable:number;settlement:string}){
 const router=useRouter();
 const [photo,setPhoto]=useState<File|null>(null),[proof,setProof]=useState<File|null>(null);
 const [method,setMethod]=useState('BKASH'),[reason,setReason]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function send(path:string,body:FormData|object){
  if(busy)return;setBusy(true);setError('');
  try{const form=body instanceof FormData;const response=await fetch('/api/rider/orders/'+encodeURIComponent(orderId)+'/'+path,{method:'POST',headers:form?undefined:{'Content-Type':'application/json'},body:form?body:JSON.stringify(body)});
   const result=await response.json().catch(()=>({}));if(!response.ok)throw Error(result.error||'Action failed');router.refresh();}
  catch(e){setError(e instanceof Error?e.message:'Action failed')}finally{setBusy(false)}
 }
 const active=['PICKED_UP','OUT_FOR_DELIVERY'].includes(status);
 return <div className="rd-handover-actions">
 {active&&<><h4>Customer delivery</h4><p>Collect full COD and take a handover photo before confirming delivery.</p><label>Customer handover picture<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e=>setPhoto(e.target.files?.[0]||null)}/></label>
 <button className="btn" type="button" disabled={!photo||busy} onClick={()=>{if(!photo||!window.confirm('Confirm parcel handed to customer and full COD received?'))return;const form=new FormData();form.append('handoverPhoto',photo);void send('handover',form)}}>Hand over parcel · confirm COD</button>
 <label>Customer refused? Enter reason<input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason for refusal"/></label><button type="button" className="btn secondary" disabled={busy||reason.trim().length<5} onClick={()=>{if(window.confirm('Confirm customer refused parcel? This will require return handling.'))void send('refuse',{reason})}}>Customer refused to receive</button></>}
 {status==='DELIVERED'&&settlement!=='CLEARED'&&settlement!=='SUBMITTED'&&<><h4>Pay merchant · ৳{merchantPayable.toFixed(2)}</h4><p>Submit proof after paying the merchant. The merchant must verify receipt.</p><select value={method} onChange={e=>setMethod(e.target.value)}><option value="BKASH">bKash</option><option value="CASH">Cash handover</option></select><label>Payment screenshot / cash handover photo<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e=>setProof(e.target.files?.[0]||null)}/></label><button className="btn" disabled={!proof||busy} onClick={()=>{if(!proof)return;const form=new FormData();form.append('method',method);form.append('proof',proof);void send('settlement',form)}}>Submit merchant payment proof</button></>}
 {status==='DELIVERED'&&settlement==='SUBMITTED'&&<p className="rd-settlement-note">Payment submitted — awaiting merchant confirmation.</p>}
 {status==='DELIVERED'&&settlement==='CLEARED'&&<p className="rd-settlement-note">Merchant payment verified · order fully settled.</p>}
 {status==='FAILED'&&<p className="rd-settlement-note">Customer refused. Return handling required.</p>}
 {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
 </div>;
}
