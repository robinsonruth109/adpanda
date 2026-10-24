'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Banknote,CheckCircle2} from 'lucide-react';
export default function RiderCodConfirmation({orderId,amount,recorded}:{orderId:string;amount:number;recorded:boolean}){
 const router=useRouter();
 const [entered,setEntered]=useState(amount.toFixed(2)),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[complete,setComplete]=useState(recorded),[message,setMessage]=useState('');
 if(complete)return <div className="rider-cod-confirmed"><CheckCircle2 size={18}/> COD cash receipt recorded. Cash deposit to Admin is separate.</div>;
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy||!confirmed)return;setBusy(true);setMessage('');
  try{const response=await fetch('/api/rider/orders/'+encodeURIComponent(orderId)+'/cod',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({amount:Number(entered),confirmed:true})});const data=await response.json();if(!response.ok)throw Error(data.error||'COD confirmation failed');setComplete(true);router.refresh()}catch(e){setMessage(e instanceof Error?e.message:'Could not confirm COD')}finally{setBusy(false)}
 }
 return <form className="rider-cod-form" onSubmit={submit}><h4><Banknote size={18}/> Confirm cash collected</h4><p>Use this only after physically receiving cash from the customer. The amount must match COD total.</p>
 <label>Cash amount received (৳)<input required type="number" min="0.01" max="100000" step=".01" value={entered} onChange={e=>setEntered(e.target.value)}/></label>
 <label className="rider-cod-checkbox"><input type="checkbox" checked={confirmed} required onChange={e=>setConfirmed(e.target.checked)}/> I have received the full cash payment</label>
 <button type="submit" className="btn" disabled={busy||!confirmed}>{busy?'Recording…':'Confirm COD received'}</button>{message&&<p role="alert">{message}</p>}
 </form>;
}
