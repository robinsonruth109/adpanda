import Link from 'next/link';
import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import {Bike,MapPin,Phone,Wallet,Package,Navigation,ShieldAlert} from 'lucide-react';
import RiderLocationSharing from '@/components/rider-location-sharing';
import RiderCodConfirmation from '@/components/rider-cod-confirmation';
import RiderRequests from '@/components/rider-requests';
import RiderAvailability from '@/components/rider-availability';
import RiderPickupAlerts from '@/components/rider-pickup-alerts';
import RiderDashboardShell from '@/components/rider-dashboard-shell';
import RiderDeliveryTabs from '@/components/rider-delivery-tabs';
import RiderDeliveryActions from '@/components/rider-delivery-actions';
import RiderFinance from '@/components/rider-finance';
import './rider-dashboard.css';
export const dynamic='force-dynamic';
const finished=['DELIVERED','CANCELLED','FAILED'];
export default async function Rider({mode='overview'}:{mode?:'overview'|'requests'|'deliveries'|'location'|'wallet'}){
 const user=await currentUser();
 if(!user||user.role!=='RIDER')return <main className="section container"><div className="eyebrow">AdPanda delivery partners</div><h1>Rider access</h1><p>Sign in with your approved rider account. Administrators register eligible accounts from the Riders dashboard.</p><Link className="btn" href="/rider/login">Rider sign in</Link></main>;
 const rider=await db.rider.findUnique({where:{userId:user.id},include:{
  deliveries:{orderBy:{assignedAt:'desc'},take:50,include:{order:{include:{kitchen:{include:{merchant:{include:{members:{where:{role:'OWNER'},take:1,include:{user:{select:{phone:true}}}}}}}},address:true,codCollection:true,customer:{select:{name:true,phone:true}}}}}},
  collections:{select:{amount:true}},deposits:{select:{id:true,amount:true,reference:true,createdAt:true},orderBy:{createdAt:'desc'}}
 }});
 if(!rider)return <main className="section container"><h1>Rider profile not found</h1><p>Contact your administrator to activate a delivery profile.</p></main>;
 const settlementLogs=await db.auditLog.findMany({where:{entityType:'Order',entityId:{in:rider.deliveries.map(d=>d.orderId)},action:{in:['RIDER_SETTLEMENT_SUBMITTED','MERCHANT_SETTLEMENT_CONFIRMED']}},select:{entityId:true,action:true,createdAt:true},orderBy:{createdAt:'asc'}});
 const settlementByOrder=new Map<string,string>();
 for(const log of settlementLogs)settlementByOrder.set(log.entityId,log.action==='MERCHANT_SETTLEMENT_CONFIRMED'?'CLEARED':'SUBMITTED');
 const financeDeliveries=mode==='overview'||mode==='wallet'?await db.deliveryAssignment.findMany({where:{riderId:rider.id,order:{status:'DELIVERED'}},orderBy:{deliveredAt:'desc'},take:500,select:{orderId:true,deliveredAt:true,order:{select:{code:true,codTotal:true,deliveryFee:true}}}}):[];
 const financeLogs=financeDeliveries.length?await db.auditLog.findMany({where:{entityType:'Order',entityId:{in:financeDeliveries.map(d=>d.orderId)},action:{in:['RIDER_SETTLEMENT_SUBMITTED','MERCHANT_SETTLEMENT_CONFIRMED']}},select:{entityId:true,action:true,createdAt:true},orderBy:{createdAt:'asc'}}):[];
 const financeStates=new Map<string,'PENDING'|'SUBMITTED'|'CLEARED'>();
 for(const log of financeLogs)financeStates.set(log.entityId,log.action==='MERCHANT_SETTLEMENT_CONFIRMED'?'CLEARED':'SUBMITTED');
 const financeRecords=financeDeliveries.filter(d=>d.deliveredAt).map(d=>({id:d.orderId,code:d.order.code,deliveredAt:d.deliveredAt!.toISOString(),cod:Number(d.order.codTotal),fee:Number(d.order.deliveryFee),net:Number(d.order.codTotal.sub(d.order.deliveryFee)),status:financeStates.get(d.orderId)||'PENDING' as const}));
 const returnIds=rider.deliveries.filter(d=>d.order.status==='FAILED').map(d=>d.orderId);
 const returnLogs=returnIds.length?await db.auditLog.findMany({where:{entityType:'Order',entityId:{in:returnIds},action:{in:['RIDER_RETURN_SUBMITTED','MERCHANT_RETURN_RECEIVED']}},select:{entityId:true,action:true},orderBy:{createdAt:'asc'}}):[];
 const returnStates=new Map<string,string>();
 for(const log of returnLogs)returnStates.set(log.entityId,log.action==='MERCHANT_RETURN_RECEIVED'?'CLOSED':'SUBMITTED');
 const active=rider.deliveries.filter(d=>!finished.includes(d.order.status)||(d.order.status==='FAILED'&&returnStates.get(d.orderId)!=='CLOSED'));
 const collected=rider.collections.reduce((s,c)=>s+Number(c.amount),0);
 const deposited=rider.deposits.reduce((s,c)=>s+Number(c.amount),0);
 return <RiderDashboardShell name={user.name} status={rider.status} approved={rider.approved} activeCount={active.length}><main className="rider-portal rd-dashboard" id="rider-overview">
  <div className="rider-portal-header"><div><span className="admin-overline">ADPANDA DELIVERY</span><h1>{mode==='overview'?'Hello, '+user.name:mode==='requests'?'Available delivery requests':mode==='deliveries'?'My deliveries':mode==='location'?'Live GPS':'Cash & wallet'}</h1><p>{mode==='overview'?'Your delivery performance at a glance.':mode==='requests'?'Review and accept incoming rider requests.':mode==='deliveries'?'Track assigned deliveries and pickup information.':mode==='location'?'Manage your live location and rider availability.':'Review COD collections and confirmed deposits.'}</p></div><span className={'admin-order-badge '+rider.status.toLowerCase()}>{rider.status}</span></div>
  {!rider.approved&&<div className="rider-alert"><ShieldAlert size={20}/><span>Your rider profile has not been approved. Admin must approve you before dispatch.</span></div>}
  
  {mode==='location'&&<div id="rider-location" className="rd-section"><RiderLocationSharing enabled={rider.approved&&rider.status!=='SUSPENDED'}/></div>}
  {(mode==='overview'||mode==='deliveries')&&<RiderPickupAlerts/>}
  {mode==='requests'&&<div id="rider-requests" className="rd-section">{rider.approved&&rider.status==='ONLINE'?<RiderRequests/>:<section className="rd-card rd-empty-requests"><div className="rd-empty-icon"><Bike size={24}/></div><h2>Available delivery requests</h2><p>{!rider.approved?'Your rider account is awaiting admin approval.':'Go online to receive delivery requests.'}</p></section>}</div>}
  {mode==='overview'&&<RiderFinance records={financeRecords} mode="overview"/>}
  {mode==='overview'&&<div className="rider-metrics rd-metrics"><div><Bike size={23}/><span>Active assignments</span><strong>{active.length}</strong></div><div><Package size={23}/><span>Total assignments</span><strong>{rider.deliveries.length}</strong></div><div><Wallet size={23}/><span>Merchant payment outstanding</span><strong>৳{financeRecords.filter(d=>d.status!=='CLEARED').reduce((a,d)=>a+d.net,0).toFixed(2)}</strong></div></div>}
  {mode==='wallet'&&<RiderFinance records={financeRecords} mode="wallet"/>}
  {mode==='deliveries'&&<><div className="rider-deliveries-heading rd-section" id="rider-deliveries"><h2>Assigned deliveries</h2><p>Only assignments associated with your rider account appear here.</p></div>
  <RiderDeliveryTabs statuses={rider.deliveries.map(d=>d.order.status)} returnStates={rider.deliveries.map(d=>returnStates.get(d.orderId)||'PENDING')} settlements={rider.deliveries.map(d=>settlementByOrder.get(d.orderId)||'PENDING')}>{rider.deliveries.map(d=><article className="rider-delivery-card" key={d.id}>
   <div className="rider-delivery-head"><div><span>ORDER</span><h3>{d.order.code}</h3></div><span className={'admin-order-badge '+d.order.status.toLowerCase()}>{d.order.status.replaceAll('_',' ')}</span></div>
   {['PLACED','MERCHANT_ACCEPTED','PREPARING'].includes(d.order.status)&&<div className="rider-preaccept-note">
    <ShieldAlert size={17}/> {d.order.status==='PLACED'?'Rider reserved. Merchant has not accepted this order yet.':'Merchant preparing the order.'} Please wait for READY / RIDER ASSIGNED before pickup.
   </div>}
   <div className="rider-delivery-stop"><div className="rider-delivery-dot pickup"/><div><small>PICKUP FROM</small><strong>{d.order.kitchen.name}</strong><p>{d.order.kitchen.address}</p>{d.order.kitchen.merchant.members[0]?.user.phone&&<a href={'tel:'+d.order.kitchen.merchant.members[0].user.phone}><Phone size={16}/> Call pickup: {d.order.kitchen.merchant.members[0].user.phone}</a>}<a target="_blank" rel="noopener noreferrer" href={'https://www.google.com/maps?q='+String(d.order.kitchen.latitude)+','+String(d.order.kitchen.longitude)}><Navigation size={16}/> Navigate to kitchen</a></div></div>
   <div className="rider-delivery-stop"><div className="rider-delivery-dot destination"/><div><small>DELIVER TO</small><strong>{d.order.recipientName||d.order.customer?.name||'Guest customer'}</strong><p>{d.order.address.details}{d.order.address.landmark?' · '+d.order.address.landmark:''}</p><div className="rider-delivery-links"><a href={'tel:'+(d.order.recipientPhone||d.order.customer?.phone||'')}><Phone size={16}/> Call customer</a><a target="_blank" rel="noopener noreferrer" href={'https://www.google.com/maps?q='+String(d.order.address.latitude)+','+String(d.order.address.longitude)}><MapPin size={16}/> Navigate</a></div></div></div>
   <div className="rider-delivery-total"><span>Collect COD on delivery</span><strong>৳{Number(d.order.codTotal).toFixed(2)}</strong></div>
   <RiderDeliveryActions orderId={d.order.id} status={d.order.status} merchantPayable={Number(d.order.codTotal.sub(d.order.deliveryFee))} codTotal={Number(d.order.codTotal)} deliveryCharge={Number(d.order.deliveryFee)} settlement={settlementByOrder.get(d.orderId)||'PENDING'} returnState={returnStates.get(d.orderId)||'PENDING'}/>
  </article>)}</RiderDeliveryTabs>
  {rider.deliveries.length===0&&<div className="admin-empty"><Bike size={37}/><h3>No assignments yet</h3><p>Admin will assign orders once your rider profile is approved and available.</p></div>}
  </>}
  <p className="muted" style={{fontSize:12,marginTop:22}}>Live GPS requires your explicit permission and an active browser page. COD receipt confirmation does not mean the cash has been deposited or reconciled with Admin.</p>
 </main></RiderDashboardShell>;
}
