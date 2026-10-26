'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export default function RiderAvailability({approved,status}:{approved:boolean;status:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const router=useRouter();
 const online=status==='ONLINE'||status==='BUSY';
 async function toggle(){
  setBusy(true);setError('');
  try{const r=await fetch('/api/rider/availability',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({online:!online})});const data=await r.json();if(!r.ok)throw Error(data.error||'Could not update availability');router.refresh();}
  catch(e){setError(e instanceof Error?e.message:'Update failed')}finally{setBusy(false)}
 }
 return <div className="rd-availability"><div><strong>Rider availability</strong><p>{!approved?'Admin approval is required before going online':status==='BUSY'?'Currently delivering an order':online?'Online · ready for delivery requests':'Offline · you will not receive delivery requests'}</p></div><button className="btn" type="button" disabled={busy||!approved||status==='BUSY'} onClick={toggle}>{busy?'Updating…':online?'Go offline':'Go online'}</button>{error&&<small role="alert">{error}</small>}</div>;
}
