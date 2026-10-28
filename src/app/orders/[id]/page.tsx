import {notFound} from 'next/navigation';
import Link from 'next/link';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
import {guestOrderAuthorized} from '@/lib/guest-order-access';
import LiveOrderTracker from '@/components/live-order-tracker';
import GuestTrackingLink from '@/components/guest-tracking-link';
import {CheckCircle2,ReceiptText,MapPin,Clock3,ShoppingBag,Camera,Wallet,Truck,ShieldCheck} from 'lucide-react';
export const dynamic='force-dynamic';
export default async function OrderDetail({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{access?:string}>}){
 const user=await currentUser();
 const {id}=await params;
 const {access}=await searchParams;
 const order=await db.order.findUnique({where:{id},include:{
  kitchen:{select:{name:true,address:true,latitude:true,longitude:true}},
  customer:{select:{name:true}},
  address:true,items:true,events:{orderBy:{createdAt:'asc'}},
  delivery:{include:{rider:{include:{user:{select:{name:true,phone:true}}}}}},
  codCollection:true
 }});
 if(!order)notFound();
 const hasGuestAccess=guestOrderAuthorized(order.guestTokenHash,typeof access==='string'?access:null);
 const authorizedByRole=Boolean(user&&(user.role==='ADMIN'||(order.customerId!==null&&user.id===order.customerId)||order.delivery?.rider.userId===user.id));
 const merchantMember=authorizedByRole||hasGuestAccess||!user?false:await db.merchantMember.findFirst({where:{userId:user.id,merchant:{kitchens:{some:{id:order.kitchenId}}}},select:{userId:true}});
 if(!authorizedByRole&&!hasGuestAccess&&!merchantMember)notFound();
 const internalAccess=Boolean(user&&(user.role==='ADMIN'||order.delivery?.rider.userId===user.id||merchantMember));
 const audit=internalAccess?await db.auditLog.findMany({where:{entityType:'Order',entityId:id},orderBy:{createdAt:'asc'},select:{id:true,action:true,createdAt:true,actorId:true,metadata:true}}):[];
 const hasAction=(name:string)=>audit.some(a=>a.action===name);
 const settlement=audit.findLast(a=>a.action==='RIDER_SETTLEMENT_SUBMITTED');
 const cleared=audit.findLast(a=>a.action==='MERCHANT_SETTLEMENT_CONFIRMED');
 const returnClosed=audit.findLast(a=>a.action==='MERCHANT_RETURN_RECEIVED');
 const settlementMeta=settlement?.metadata;
 const settlementData=settlementMeta&&typeof settlementMeta==='object'&&!Array.isArray(settlementMeta)?settlementMeta:null;
 const fmt=(v:Date|null|undefined)=>v?v.toLocaleString('en-BD',{timeZone:'Asia/Dhaka'}):'Not recorded';
 const money=(n:unknown)=>'৳'+Number(n).toFixed(2);
 const proofTypes=[{type:'parcel',label:'Sealed parcel photo',action:'MERCHANT_DISPATCH_PROOF'},{type:'rider-handover',label:'Merchant to rider handover',action:'MERCHANT_DISPATCH_PROOF'},{type:'customer-handover',label:'Customer delivery photo',action:'RIDER_CUSTOMER_HANDOVER'},{type:'payment',label:'Rider payment screenshot / cash proof',action:'RIDER_SETTLEMENT_SUBMITTED'},{type:'return-rider',label:'Returned parcel · rider photo',action:'RIDER_RETURN_SUBMITTED'},{type:'return-merchant',label:'Return received · merchant photo',action:'MERCHANT_RETURN_RECEIVED'}];

 return <main className="customer-order-detail container">
  <div className="customer-order-detail-title"><div><span className="admin-overline">ADPANDA ORDER</span><h1>Order {order.code}</h1><p>Placed {order.placedAt.toLocaleString('en-BD',{timeZone:'Asia/Dhaka'})} · Cash on delivery</p></div><span className={'admin-order-badge '+order.status.toLowerCase()}>{order.status.replaceAll('_',' ')}</span></div>
  <div className="customer-order-detail-grid"><section className="customer-order-main">
   <div className="customer-order-summary"><h2><ReceiptText size={21}/> Order summary</h2><p><strong>{order.kitchen.name}</strong><br/>{order.kitchen.address}</p><div className="customer-order-item-list">{order.items.map(i=><div key={i.id}><span>{i.itemName} × {i.quantity}</span><strong>৳{Number(i.lineTotal).toFixed(2)}</strong></div>)}</div><div className="customer-order-totals"><p><span>Food</span><strong>৳{Number(order.foodSubtotal).toFixed(2)}</strong></p><p><span>Delivery fee</span><strong>৳{Number(order.deliveryFee).toFixed(2)}</strong></p><p className="total"><span>Total COD</span><strong>৳{Number(order.codTotal).toFixed(2)}</strong></p></div><p className="customer-order-cod-status">{order.codCollection?<><CheckCircle2 size={16}/> Rider confirmed receipt of COD cash</>:<><Clock3 size={16}/> COD cash receipt not yet recorded</>}</p></div>
   <div className="customer-order-summary"><h2><MapPin size={20}/> ডেলিভারি ঠিকানা</h2><p><strong>{order.recipientName||order.customer?.name||'Customer'} · {order.recipientPhone||'—'}</strong></p><p>{order.address.details}{order.address.landmark?' · '+order.address.landmark:''}</p><p className="muted" style={{fontSize:12}}>Confirmed pin: {String(order.address.latitude)}, {String(order.address.longitude)}</p></div>
   <div className="customer-order-summary"><h2><ShoppingBag size={20}/> Order activity</h2><div className="customer-order-events">{order.events.map(e=><div key={e.id}><span>{e.toStatus.replaceAll('_',' ')}</span><small>{e.createdAt.toLocaleString('en-BD',{timeZone:'Asia/Dhaka'})}</small></div>)}</div></div>

   {internalAccess&&<section className="order-audit">
    <div className="order-audit-heading"><h2><ShieldCheck size={22}/> Complete order record</h2><p>Private operational audit · order, rider handover, COD and settlement</p></div>
    <div className="order-audit-stats"><div><small>Rider</small><strong>{order.delivery?.rider.user.name||'Not assigned'}</strong><span>{order.delivery?.rider.user.phone||''}</span></div><div><small>Assigned</small><strong>{fmt(order.delivery?.assignedAt)}</strong></div><div><small>Delivered</small><strong>{fmt(order.delivery?.deliveredAt)}</strong></div><div><small>Customer COD collected</small><strong>{money(order.codCollection?.amount||0)}</strong><span>{fmt(order.codCollection?.collectedAt)}</span></div></div>
    <div className="order-audit-money"><h3><Wallet size={19}/> Financial reconciliation</h3><div><span>Food subtotal</span><strong>{money(order.foodSubtotal)}</strong></div><div><span>Customer delivery charge (rider earning)</span><strong>{money(order.deliveryFee)}</strong></div><div><span>Total COD collected</span><strong>{money(order.codTotal)}</strong></div><div className="order-audit-net"><span>Pay merchant (COD minus delivery fee)</span><strong>{money(order.codTotal.sub(order.deliveryFee))}</strong></div><div><span>Rider payment method</span><strong>{typeof settlementData?.method==='string'?settlementData.method:'Not submitted'}</strong></div><div><span>Rider proof submitted</span><strong>{fmt(settlement?.createdAt)}</strong></div><div><span>Merchant cash receipt confirmed</span><strong>{fmt(cleared?.createdAt)}</strong></div><span className={'order-audit-payment-state '+(cleared?'cleared':settlement?'submitted':'pending')}>{order.status==='FAILED'?(returnClosed?'RETURN RECEIVED · CLOSED · NO TRANSACTION':'RETURN TO MERCHANT PENDING · NO TRANSACTION'):cleared?'PAYMENT CLEARED':settlement?'AWAITING MERCHANT VERIFICATION':'PAYMENT NOT SUBMITTED'}</span></div>
    <h3><Camera size={19}/> Photographic evidence</h3>
    <div className="order-audit-proof-grid">{proofTypes.map(proof=><article className="order-audit-proof" key={proof.type}><strong>{proof.label}</strong>{hasAction(proof.action)?<a href={'/api/orders/'+order.id+'/evidence?type='+proof.type} target="_blank" rel="noopener noreferrer"><img src={'/api/orders/'+order.id+'/evidence?type='+proof.type} alt={proof.label} loading="lazy"/><span>Open full-size evidence ↗</span></a>:<p>Not uploaded</p>}</article>)}</div>
    <h3><Clock3 size={19}/> Full operational audit history</h3>
    <div className="order-audit-history">{audit.map(a=><div key={a.id}><strong>{a.action.replaceAll('_',' ')}</strong><span>{fmt(a.createdAt)}</span></div>)}{!audit.length&&<p>No additional audit entries.</p>}</div>
   </section>}
   {hasGuestAccess?<div className="customer-guest-success-note"><strong>✅ আপনার অর্ডার কনফার্ম হয়েছে।</strong><p>এই লিংকটি সংরক্ষণ করুন—পরে লগইন ছাড়াই অর্ডারের আপডেট দেখতে পারবেন। ব্যক্তিগত Tracking Link অন্য কাউকে শেয়ার করবেন না।</p><GuestTrackingLink/></div>:<Link href="/orders" className="adp-pink-link">← My orders</Link>}
  </section>
  <aside><LiveOrderTracker orderId={order.id} guestAccess={hasGuestAccess?access:undefined} kitchen={{latitude:Number(order.kitchen.latitude),longitude:Number(order.kitchen.longitude)}} delivery={{latitude:Number(order.address.latitude),longitude:Number(order.address.longitude)}}/></aside>
  </div>
 </main>;
}
