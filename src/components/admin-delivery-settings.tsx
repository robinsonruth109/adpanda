'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export default function DeliverySettings({initialFee,initialRadius}:{initialFee:string;initialRadius:string}){
 const [fee,setFee]=useState(initialFee),[radius,setRadius]=useState(initialRadius),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const router=useRouter();
 async function save(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setMessage('');
  try{const res=await fetch('/api/admin/settings/delivery',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({deliveryFee:Number(fee),deliveryRadiusKm:Number(radius)})});const data=await res.json();if(!res.ok)throw Error(data.error||'Could not save');setMessage('Delivery policy saved. Customer checkout is now allowed within this radius for open approved kitchens.');router.refresh()}catch(e){setMessage(e instanceof Error?e.message:'Unable to save')}finally{setBusy(false)}
 }
 return <form className="panel adp-settings" onSubmit={save}><h2>Customer delivery policy</h2><p className="muted">Configure a flat delivery fee and maximum straight-line distance from each kitchen. Both values are required before COD checkout can accept orders. Distance is not a road-route estimate.</p>
 <label>Delivery fee (৳ per order)<input type="number" required step="0.01" min="0" max="1000" value={fee} onChange={e=>setFee(e.target.value)} placeholder="Set delivery fee"/></label>
 <label>Maximum delivery radius (km)<input type="number" required step="0.1" min="0.1" max="100" value={radius} onChange={e=>setRadius(e.target.value)} placeholder="Set radius"/></label>
 <button className="btn" type="submit" disabled={busy}>{busy?'Saving…':'Save delivery policy'}</button>{message&&<p role="status">{message}</p>}
 </form>;
}
