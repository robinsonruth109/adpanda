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
import './rider-dashboard.css';
export const dynamic='force-dynamic';
const finished=['DELIVERED','CANCELLED','FAILED'];
export default async function Rider(){
 const user=await currentUser();
 if(!user||user.role!=='RIDER')return <main className="section container"><div className="eyebrow">AdPanda delivery partners</div><h1>Rider access</h1><p>Sign in with your approved rider account. Administrators register eligible accounts from the Riders dashboard.</p><Link className="btn" href="/rider/login">Rider sign in</Link></main>;
 const rider=await db.rider.findUnique({where:{userId:user.id},include:{
  deliveries:{orderBy:{assignedAt:'desc'},take:50,include:{order:{include:{kitchen:{include:{merchant:{include:{members:{where:{role:'OWNER'},take:1,include:{user:{select:{phone:true}}}}}}}},address:true,codCollection:true,customer:{select:{name:true,phone:true}}}}}},
  collections:{select:{amount:true}},deposits:{select:{id:true,amount:true,reference:true,createdAt:true},orderBy:{createdAt:'desc'}}
 }});
 if(!rider)return <main className="section container"><h1>Rider profile not found</h1><p>Contact your administrator to activate a delivery profile.</p></main>;
 const active=rider.deliveries.filter(d=>!finished.includes(d.order.status));
 const collected=rider.collections.reduce((s,c)=>s+Number(c.amount),0);
 const deposited=rider.deposits.reduce((s,c)=>s+Number(c.amount),0);
 return <RiderDashboardShell name={user.name} status={rider.status} approved={rider.approved} activeCount={active.length}><main className="rider-portal rd-dashboard" id="rider-overview">
  <div className="rider-portal-header"><div><span className="admin-overline">ADPANDA DELIVERY</span><h1>Hello, {user.name}</h1><p>Keep your pickup and delivery information handy.</p></div><span className={'admin-order-badge '+rider.status.toLowerCase()}>{rider.status}</span></div>
  {!rider.approved&&<div className="rider-alert"><ShieldAlert size={20}/><span>Your rider profile has not been approved. Admin must approve you before dispatch.</span></div>}
  
  <div id="rider-location" className="rd-section"><RiderLocationSharing enabled={rider.approved&&rider.status!=='SUSPENDED'}/></div>
  <RiderPickupAlerts/>
  <div id="rider-requests" className="rd-section">{rider.approved&&rider.status==='ONLINE'?<RiderRequests/>:<section className="rd-card rd-empty-requests"><div className="rd-empty-icon"><Bike size={24}/></div><h2>Available delivery requests</h2><p>{!rider.approved?'Your rider account is awaiting admin approval.':'Go online to receive delivery requests.'}</p></section>}</div>
  <div className="rider-metrics rd-metrics"><div><Bike size={23}/><span>Active assignments</span><strong>{active.length}</strong></div><div><Package size={23}/><span>Total assignments</span><strong>{rider.deliveries.length}</strong></div><div><Wallet size={23}/><span>Recorded COD outstanding</span><strong>৳{(collected-deposited).toFixed(2)}</strong></div></div>
  <section className="rider-cash-history rd-section" id="rider-wallet"><div><h2>Cash handover history</h2><p>Only Admin-confirmed cash deposits count toward clearing outstanding COD.</p></div>
   <div className="rider-cash-history-list">{rider.deposits.slice(0,8).map(d=><div key={d.id}><div><strong>৳{Number(d.amount).toFixed(2)}</strong><small>{d.createdAt.toLocaleString('en-BD',{timeZone:'Asia/Dhaka'})}</small></div><span>{d.reference||'Admin cash deposit'}</span></div>)}{!rider.deposits.length&&<div className="rider-cash-no-history">No Admin-confirmed cash deposits recorded yet.</div>}</div>
  </section>
  <div className="rider-deliveries-heading rd-section" id="rider-deliveries"><h2>Assigned deliveries</h2><p>Only assignments associated with your rider account appear here.</p></div>
  <div className="rider-deliveries">{rider.deliveries.map(d=><article className="rider-delivery-card" key={d.id}>
   <div className="rider-delivery-head"><div><span>ORDER</span><h3>{d.order.code}</h3></div><span className={'admin-order-badge '+d.order.status.toLowerCase()}>{d.order.status.replaceAll('_',' ')}</span></div>
   {['PLACED','MERCHANT_ACCEPTED','PREPARING'].includes(d.order.status)&&<div className="rider-preaccept-note">
    <ShieldAlert size={17}/> {d.order.status==='PLACED'?'Rider reserved. Merchant has not accepted this order yet.':'Merchant preparing the order.'} Please wait for READY / RIDER ASSIGNED before pickup.
   </div>}
   <div className="rider-delivery-stop"><div className="rider-delivery-dot pickup"/><div><small>PICKUP FROM</small><strong>{d.order.kitchen.name}</strong><p>{d.order.kitchen.address}</p>{d.order.kitchen.merchant.members[0]?.user.phone&&<a href={'tel:'+d.order.kitchen.merchant.members[0].user.phone}><Phone size={16}/> Call pickup: {d.order.kitchen.merchant.members[0].user.phone}</a>}<a target="_blank" rel="noopener noreferrer" href={'https://www.google.com/maps?q='+String(d.order.kitchen.latitude)+','+String(d.order.kitchen.longitude)}><Navigation size={16}/> Navigate to kitchen</a></div></div>
   <div className="rider-delivery-stop"><div className="rider-delivery-dot destination"/><div><small>DELIVER TO</small><strong>{d.order.recipientName||d.order.customer?.name||'Guest customer'}</strong><p>{d.order.address.details}{d.order.address.landmark?' · '+d.order.address.landmark:''}</p><div className="rider-delivery-links"><a href={'tel:'+(d.order.recipientPhone||d.order.customer?.phone||'')}><Phone size={16}/> Call customer</a><a target="_blank" rel="noopener noreferrer" href={'https://www.google.com/maps?q='+String(d.order.address.latitude)+','+String(d.order.address.longitude)}><MapPin size={16}/> Navigate</a></div></div></div>
   <div className="rider-delivery-total"><span>Collect COD on delivery</span><strong>৳{Number(d.order.codTotal).toFixed(2)}</strong></div>
   {d.order.status==='DELIVERED'&&<RiderCodConfirmation orderId={d.order.id} amount={Number(d.order.codTotal)} recorded={Boolean(d.order.codCollection)}/>}
  </article>)}</div>
  {rider.deliveries.length===0&&<div className="admin-empty"><Bike size={37}/><h3>No assignments yet</h3><p>Admin will assign orders once your rider profile is approved and available.</p></div>}
  <p className="muted" style={{fontSize:12,marginTop:22}}>Live GPS requires your explicit permission and an active browser page. COD receipt confirmation does not mean the cash has been deposited or reconciled with Admin.</p>
 </main></RiderDashboardShell>;
}
