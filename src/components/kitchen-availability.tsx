'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export default function KitchenAvailability({id,initial}:{id:string;initial:boolean}){
 const router=useRouter();const [open,setOpen]=useState(initial),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function toggle(){
  setBusy(true);setMessage('');
  try{const response=await fetch('/api/merchant/kitchens/'+encodeURIComponent(id)+'/availability',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({acceptingOrders:!open})});const result=await response.json();if(!response.ok)throw Error(result.error||'Could not update kitchen');setOpen(result.acceptingOrders);router.refresh()}catch(e){setMessage(e instanceof Error?e.message:'Update failed')}finally{setBusy(false)}
 }
 return <div className="kitchen-availability"><div><strong>Customer ordering</strong><p className="muted">{open?'Kitchen is OPEN and accepting COD orders.':'Kitchen is CLOSED for new orders.'}</p></div><button type="button" className={'btn '+(open?'secondary':'')} onClick={toggle} disabled={busy}>{busy?'Updating…':open?'Pause new orders':'Open for orders'}</button>{message&&<p role="alert">{message}</p>}</div>;
}
