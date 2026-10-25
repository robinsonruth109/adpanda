'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Clock3,CalendarDays,Power,RefreshCcw} from 'lucide-react';
import {dayNames,defaultKitchenHours,validHours,type DayHours} from '@/lib/kitchen-hours';
type Props={id:string;approved:boolean;mode:string;effectiveOpen:boolean;hours:unknown};
export default function MerchantKitchenHours({id,approved,mode,effectiveOpen,hours}:Props){
 const router=useRouter();
 const [days,setDays]=useState<DayHours>(validHours(hours)||defaultKitchenHours);
 const [currentMode,setCurrentMode]=useState(mode);
 const [isOpen,setIsOpen]=useState(effectiveOpen);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const isAuto=currentMode==='AUTO';
 function edit(day:number,change:Partial<DayHours[number]>){setDays(v=>v.map(d=>d.day===day?{...d,...change}:d))}
 async function saveHours(){
  if(busy||!approved)return;
  if(days.some(d=>!d.closed&&d.open===d.close)){setNotice('Opening and closing times cannot be equal');return}
  setBusy(true);setNotice('');
  try{
   const response=await fetch('/api/merchant/kitchens/'+encodeURIComponent(id)+'/schedule',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({hours:days,enableAuto:true})});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Could not save schedule');
   setCurrentMode('AUTO');setIsOpen(data.open);setNotice('Weekly hours saved. Automatic opening and closing are enabled.');router.refresh();
  }catch(e){setNotice(e instanceof Error?e.message:'Save failed')}finally{setBusy(false)}
 }
 async function setAvailability(kind:'AUTO'|'OPEN'|'CLOSED'){
  if(busy||!approved)return;setBusy(true);setNotice('');
  try{
   const payload=kind==='AUTO'?{mode:'AUTO'}:{acceptingOrders:kind==='OPEN'};
   const response=await fetch('/api/merchant/kitchens/'+encodeURIComponent(id)+'/availability',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to update kitchen');
   setCurrentMode(data.mode);setIsOpen(data.acceptingOrders);
   setNotice(kind==='AUTO'?'Automatic schedule activated':kind==='OPEN'?'Manual open enabled. Kitchen stays open until you switch back to schedule or close it.':'Manual close enabled. Orders remain paused until you change the mode.');
   router.refresh();
  }catch(e){setNotice(e instanceof Error?e.message:'Update failed')}finally{setBusy(false)}
 }
 return <div className="merchant-hours-manager">
  <div className="merchant-hours-summary"><div><strong>{isOpen?'● Accepting orders':'● Not accepting orders'}</strong><small>{isAuto?'Automatic weekly schedule':'Manual override'} · Asia/Dhaka (Bangladesh time)</small></div><span className={isOpen?'is-open':'is-closed'}>{isOpen?'OPEN':'CLOSED'}</span></div>
  <div className="merchant-hours-control"><button type="button" className="merchant-hours-open" disabled={!approved||busy} onClick={()=>setAvailability('OPEN')}><Power size={17}/> Manual open</button><button type="button" className="merchant-hours-close" disabled={!approved||busy} onClick={()=>setAvailability('CLOSED')}><Power size={17}/> Manual close</button><button type="button" className={'merchant-hours-auto'+(isAuto?' active':'')} disabled={!approved||busy} onClick={()=>setAvailability('AUTO')}><RefreshCcw size={17}/> Follow schedule</button></div>
  <div className="merchant-hours-table-head"><div><CalendarDays size={19}/><strong>Weekly opening hours</strong></div><p>Set a day off, opening time and closing time for every day.</p></div>
  <div className="merchant-hours-days">{days.map(d=><div className={'merchant-hours-day'+(d.closed?' day-off':'')} key={d.day}>
   <strong>{dayNames[d.day]}</strong>
   <label className="merchant-hours-day-off"><input type="checkbox" checked={d.closed} onChange={e=>edit(d.day,{closed:e.target.checked})} disabled={!approved}/> Day off</label>
   <div><label>Opens<input type="time" disabled={d.closed||!approved} value={d.open} onChange={e=>edit(d.day,{open:e.target.value})}/></label><span>to</span><label>Closes<input type="time" disabled={d.closed||!approved} value={d.close} onChange={e=>edit(d.day,{close:e.target.value})}/></label></div>
  </div>)}</div>
  <div className="merchant-hours-save"><button type="button" className="merchant-primary-button" disabled={busy||!approved} onClick={saveHours}><Clock3 size={17}/>{busy?'Updating…':'Save hours & enable auto'}</button><p>Overnight hours supported (e.g. 17:00–02:00). Manual open/close overrides the automatic schedule until you select Follow schedule.</p></div>
  {notice&&<p className="merchant-inline-alert" role="status">{notice}</p>}
 </div>;
}
