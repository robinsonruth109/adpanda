'use client';
import {useEffect,useRef,useState} from 'react';
import {BellRing} from 'lucide-react';
type Alert={id:string;entityId:string;createdAt:string};
export default function RiderPickupAlerts(){
 const [alerts,setAlerts]=useState<Alert[]>([]);
 const seen=useRef<Set<string>|null>(null);
 useEffect(()=>{
  let active=true;
  async function poll(){
   try{
    const response=await fetch('/api/rider/pickup-alerts',{cache:'no-store'});
    if(!response.ok)return;
    const payload=await response.json();
    const next:Alert[]=payload.alerts||[];
    if(!active)return;
    if(seen.current!==null){
     for(const alert of next)if(!seen.current.has(alert.id)&&'Notification' in window&&Notification.permission==='granted')
      new Notification('Pickup requested',{body:'Merchant is preparing order. Please navigate to the pickup location.'});
    }
    seen.current=new Set(next.map(a=>a.id));
    setAlerts(next);
   }catch{}
  }
  void poll();const timer=window.setInterval(()=>void poll(),8000);
  return()=>{active=false;window.clearInterval(timer)};
 },[]);
 if(!alerts.length)return null;
 return <section className="rd-card rd-section" role="status"><h2><BellRing size={19}/> Pickup requested</h2><p>The merchant has asked you to come for pickup. Check your assigned delivery card for navigation.</p>{'Notification' in globalThis&&Notification.permission==='default'&&<button type="button" className="btn secondary" onClick={()=>void Notification.requestPermission()}>Enable browser notifications</button>}</section>;
}
