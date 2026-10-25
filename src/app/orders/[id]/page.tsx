import {notFound} from 'next/navigation';
import Link from 'next/link';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
import {guestOrderAuthorized} from '@/lib/guest-order-access';
import LiveOrderTracker from '@/components/live-order-tracker';
import {CheckCircle2,ReceiptText,MapPin,Clock3,ShoppingBag} from 'lucide-react';
export const dynamic='force-dynamic';
export default async function OrderDetail({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{access?:string}>}){
 const user=await currentUser();
 const {id}=await params;
 const {access}=await searchParams;
 const order=await db.order.findUnique({where:{id},include:{
  kitchen:{select:{name:true,address:true,latitude:true,longitude:true}},
  customer:{select:{name:true}},
  address:true,items:true,events:{orderBy:{createdAt:'asc'}},
  delivery:{include:{rider:{include:{user:{select:{name:true}}}}}},
  codCollection:true
 }});
 if(!order)notFound();
 const hasGuestAccess=guestOrderAuthorized(order.guestTokenHash,typeof access==='string'?access:null);
 const authorizedByRole=Boolean(user&&(user.role==='ADMIN'||(order.customerId!==null&&user.id===order.customerId)||order.delivery?.rider.userId===user.id));
 const merchantMember=authorizedByRole||hasGuestAccess||!user?false:await db.merchantMember.findFirst({where:{userId:user.id,merchant:{kitchens:{some:{id:order.kitchenId}}}},select:{userId:true}});
 if(!authorizedByRole&&!hasGuestAccess&&!merchantMember)notFound();
 return <main className="customer-order-detail container">
  <div className="customer-order-detail-title"><div><span className="admin-overline">ADPANDA ORDER</span><h1>Order {order.code}</h1><p>Placed {order.placedAt.toLocaleString('en-BD',{timeZone:'Asia/Dhaka'})} · Cash on delivery</p></div><span className={'admin-order-badge '+order.status.toLowerCase()}>{order.status.replaceAll('_',' ')}</span></div>
  <div className="customer-order-detail-grid"><section className="customer-order-main">
   <div className="customer-order-summary"><h2><ReceiptText size={21}/> Order summary</h2><p><strong>{order.kitchen.name}</strong><br/>{order.kitchen.address}</p><div className="customer-order-item-list">{order.items.map(i=><div key={i.id}><span>{i.itemName} × {i.quantity}</span><strong>৳{Number(i.lineTotal).toFixed(2)}</strong></div>)}</div><div className="customer-order-totals"><p><span>Food</span><strong>৳{Number(order.foodSubtotal).toFixed(2)}</strong></p><p><span>Delivery fee</span><strong>৳{Number(order.deliveryFee).toFixed(2)}</strong></p><p className="total"><span>Total COD</span><strong>৳{Number(order.codTotal).toFixed(2)}</strong></p></div><p className="customer-order-cod-status">{order.codCollection?<><CheckCircle2 size={16}/> Rider confirmed receipt of COD cash</>:<><Clock3 size={16}/> COD cash receipt not yet recorded</>}</p></div>
   <div className="customer-order-summary"><h2><MapPin size={20}/> ডেলিভারি ঠিকানা</h2><p><strong>{order.recipientName||order.customer?.name||'Customer'} · {order.recipientPhone||'—'}</strong></p><p>{order.address.details}{order.address.landmark?' · '+order.address.landmark:''}</p><p className="muted" style={{fontSize:12}}>Confirmed pin: {String(order.address.latitude)}, {String(order.address.longitude)}</p></div>
   <div className="customer-order-summary"><h2><ShoppingBag size={20}/> Order activity</h2><div className="customer-order-events">{order.events.map(e=><div key={e.id}><span>{e.toStatus.replaceAll('_',' ')}</span><small>{e.createdAt.toLocaleString('en-BD',{timeZone:'Asia/Dhaka'})}</small></div>)}</div></div>
   {hasGuestAccess?<div className="customer-guest-success-note"><strong>✅ আপনার অর্ডার কনফার্ম হয়েছে।</strong><p>এই লিংকটি সংরক্ষণ করুন—পরে লগইন ছাড়াই অর্ডারের আপডেট দেখতে পারবেন। ব্যক্তিগত Tracking Link অন্য কাউকে শেয়ার করবেন না।</p></div>:<Link href="/orders" className="adp-pink-link">← My orders</Link>}
  </section>
  <aside><LiveOrderTracker orderId={order.id} guestAccess={hasGuestAccess?access:undefined} kitchen={{latitude:Number(order.kitchen.latitude),longitude:Number(order.kitchen.longitude)}} delivery={{latitude:Number(order.address.latitude),longitude:Number(order.address.longitude)}}/></aside>
  </div>
 </main>;
}
