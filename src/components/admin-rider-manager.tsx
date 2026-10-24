'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Bike,CheckCircle2,Phone,Plus,ShieldCheck,UserCheck,Users} from 'lucide-react';

export type RiderSummary={id:string;name:string;phone:string;status:string;approved:boolean;assignments:number};
export default function AdminRiderManager({initialRiders}:{initialRiders:RiderSummary[]}){
 const router=useRouter();
 const [riders,setRiders]=useState(initialRiders),[phone,setPhone]=useState(''),[busy,setBusy]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>setRiders(initialRiders),[initialRiders]);
 async function register(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  if(!window.confirm('Convert the existing customer account '+phone+' to a Rider?'))return;
  setBusy('new');setNotice('');
  try{
   const response=await fetch('/api/admin/riders',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:phone.trim()})});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Could not register rider');
   setPhone('');setNotice('Rider registered. Review and approve them before setting online.');router.refresh();
  }catch(error){setNotice(error instanceof Error?error.message:'Could not add rider')}finally{setBusy('')}
 }
 async function update(rider:RiderSummary,body:{approved?:boolean;status?:string}){
  if(busy)return;
  const action=body.approved===false?'revoke approval':body.approved===true?'approve':body.status==='SUSPENDED'?'suspend':'change availability';
  if((body.approved===false||body.status==='SUSPENDED')&&!window.confirm('Confirm '+action+' for '+rider.name+'?'))return;
  setBusy(rider.id);setNotice('');
  try{
   const response=await fetch('/api/admin/riders/'+encodeURIComponent(rider.id),{method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Rider update failed');
   setRiders(prev=>prev.map(r=>r.id===rider.id?{...r,approved:data.approved,status:data.status}:r));setNotice(rider.name+' updated successfully.');router.refresh();
  }catch(error){setNotice(error instanceof Error?error.message:'Could not update rider');router.refresh()}finally{setBusy('')}
 }
 const approved=riders.filter(r=>r.approved).length,online=riders.filter(r=>r.status==='ONLINE').length;
 return <div className="admin-rider-screen">
  <div className="admin-rider-stats">
   <div><Users size={20}/><span>Total riders</span><strong>{riders.length}</strong></div>
   <div><UserCheck size={20}/><span>Approved</span><strong>{approved}</strong></div>
   <div><CheckCircle2 size={20}/><span>Available online</span><strong>{online}</strong></div>
  </div>
  <form className="admin-rider-onboard" onSubmit={register}>
   <div><span className="admin-overline">ONBOARD RIDER</span><h2>Register a delivery partner</h2><p>Rider must first create a regular AdPanda account using phone and password. Admin then converts that eligible account into a rider profile.</p></div>
   <div className="admin-rider-add-controls"><label htmlFor="new-rider-phone">Account phone number</label><div><input id="new-rider-phone" required inputMode="tel" pattern="01[3-9][0-9]{8}" maxLength={11} placeholder="01XXXXXXXXX" value={phone} onChange={e=>setPhone(e.target.value)}/><button className="btn" disabled={!!busy} type="submit"><Plus size={17}/> Add rider</button></div></div>
  </form>
  {notice&&<p className="admin-order-notice" role="status">{notice}</p>}
  <div className="admin-rider-list">{riders.map(r=><article className="admin-rider-card" key={r.id}>
   <div className="admin-rider-card-title"><div className="admin-rider-icon"><Bike size={23}/></div><div><h3>{r.name}</h3><a href={'tel:'+r.phone}><Phone size={14}/> {r.phone}</a></div><span className={'admin-order-badge '+r.status.toLowerCase()}>{r.status}</span></div>
   <div className="admin-rider-meta"><span><ShieldCheck size={15}/> {r.approved?'Approved':'Not approved'}</span><span>{r.assignments} total assignments</span></div>
   <div className="admin-rider-actions">
    {!r.approved&&<button disabled={!!busy} onClick={()=>update(r,{approved:true,status:'OFFLINE'})}>Approve</button>}
    {r.approved&&r.status!=='BUSY'&&<button disabled={!!busy} onClick={()=>update(r,{status:r.status==='ONLINE'?'OFFLINE':'ONLINE'})}>{r.status==='ONLINE'?'Set offline':'Set online'}</button>}
    {r.approved&&r.status!=='BUSY'&&<button className="danger" disabled={!!busy} onClick={()=>update(r,{approved:false,status:'SUSPENDED'})}>Suspend access</button>}
    {r.status==='BUSY'&&<span className="muted">On active delivery — cannot change availability</span>}
   </div>
  </article>)}</div>
  {riders.length===0&&<div className="admin-empty"><Bike size={36}/><h3>No riders added yet</h3><p>Register an eligible user above, approve, then set online to make them available for dispatch.</p></div>}
 </div>;
}
