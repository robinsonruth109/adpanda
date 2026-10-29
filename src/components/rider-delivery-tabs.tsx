'use client';
import {Children,useState,type ReactNode} from 'react';
export default function RiderDeliveryTabs({statuses,settlements,returnStates,children}:{statuses:string[];settlements:string[];returnStates:string[];children:ReactNode}){
 const [tab,setTab]=useState('ACTIVE');
 const cards=Children.toArray(children);
 const choices=[['ACTIVE','Active orders'],['DELIVERED','Delivered orders'],['PENDING','Pending payment'],['CLEARED','Payment cleared'],['RETURNS','Returns']];
 const match=(i:number,key:string)=>key==='ACTIVE'? (!['DELIVERED','FAILED','CANCELLED'].includes(statuses[i])||(statuses[i]==='FAILED'&&returnStates[i]!=='CLOSED')):
 key==='RETURNS'?statuses[i]==='FAILED':key==='DELIVERED'?statuses[i]==='DELIVERED':key==='PENDING'?statuses[i]==='DELIVERED'&&settlements[i]!=='CLEARED':statuses[i]==='DELIVERED'&&settlements[i]==='CLEARED';
 const visible=cards.filter((_,i)=>match(i,tab));
 return <><div className="rd-delivery-tabs" role="tablist" aria-label="Delivery order filters">{choices.map(([id,label])=><button key={id} role="tab" type="button" aria-selected={tab===id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}<span>{statuses.filter((_,i)=>match(i,id)).length}</span></button>)}</div><div className="rider-deliveries">{visible}</div>{!visible.length&&<div className="rd-card" style={{textAlign:'center',padding:32}}>No orders in this section.</div>}</>;
}
