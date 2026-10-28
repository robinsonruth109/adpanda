import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import MerchantOrdersManager from '@/components/merchant-orders-manager';
import Link from 'next/link';
export const dynamic='force-dynamic';
export default async function MerchantOrdersPage(){
 const user=await currentUser();
 if(!user)return <main className="section container"><h1>Merchant orders</h1><Link href="/merchant/login" className="btn">Merchant login</Link></main>;
 const memberships=await db.merchantMember.findMany({where:{userId:user.id},select:{merchantId:true}});
 const ids=memberships.map(x=>x.merchantId);
 const orders=ids.length?await db.order.findMany({where:{kitchen:{merchantId:{in:ids}}},orderBy:{placedAt:'desc'},take:100,include:{items:true,address:{select:{details:true,landmark:true}},customer:{select:{name:true,phone:true}},kitchen:{select:{name:true}},delivery:{select:{rider:{select:{user:{select:{name:true,phone:true}}}}}}}}):[];
 const returnLogs=orders.length?await db.auditLog.findMany({where:{entityType:'Order',entityId:{in:orders.map(o=>o.id)},action:{in:['RIDER_RETURN_SUBMITTED','MERCHANT_RETURN_RECEIVED']}},select:{entityId:true,action:true},orderBy:{createdAt:'asc'}}):[];
 const returnState=new Map<string,string>();
 for(const item of returnLogs)returnState.set(item.entityId,item.action==='MERCHANT_RETURN_RECEIVED'?'CLOSED':'SUBMITTED');
 const payments=orders.length?await db.auditLog.findMany({where:{entityType:'Order',entityId:{in:orders.map(o=>o.id)},action:{in:['RIDER_SETTLEMENT_SUBMITTED','MERCHANT_SETTLEMENT_CONFIRMED']}},select:{entityId:true,action:true,metadata:true,createdAt:true},orderBy:{createdAt:'asc'}}):[];
 const paymentByOrder=new Map<string,{status:string;method:string|null;amount:string|null;submittedAt:string|null}>();
 for(const item of payments){
  const previous=paymentByOrder.get(item.entityId);
  if(item.action==='MERCHANT_SETTLEMENT_CONFIRMED')paymentByOrder.set(item.entityId,{status:'CLEARED',method:previous?.method||null,amount:previous?.amount||null,submittedAt:previous?.submittedAt||null});
  else {
   const m=item.metadata;
   const data=m&&typeof m==='object'&&!Array.isArray(m)?m:null;
   paymentByOrder.set(item.entityId,{status:'SUBMITTED',method:typeof data?.method==='string'?data.method:null,amount:typeof data?.amount==='string'?data.amount:null,submittedAt:item.createdAt.toISOString()});
  }
 }
 return <section className="merchant-workspace-page">
  <div className="merchant-page-intro"><div><span className="merchant-kicker">ORDER OPERATIONS</span><h1>Order management</h1><p>Find an available delivery man first, then accept the order and prepare items for pickup.</p></div><span className="merchant-intro-pill">{orders.filter(o=>o.status==='PLACED').length} new orders</span></div>
  <MerchantOrdersManager initial={orders.map(o=>({id:o.id,code:o.code,status:o.status,customer:o.recipientName||o.customer?.name||'Guest customer',phone:o.recipientPhone||o.customer?.phone||'',address:[o.address.details,o.address.landmark].filter(Boolean).join(' · '),kitchen:o.kitchen.name,items:o.items.map(i=>({name:i.itemName,quantity:i.quantity,lineTotal:Number(i.lineTotal)})),codTotal:Number(o.codTotal),foodSubtotal:Number(o.foodSubtotal),placedAt:o.placedAt.toISOString(),rider:o.delivery?.rider.user.name||null,riderPhone:o.delivery?.rider.user.phone||null,dispatchRequestedAt:o.dispatchRequestedAt?.toISOString()||null,settlement:paymentByOrder.get(o.id)?.status||'PENDING',paymentMethod:paymentByOrder.get(o.id)?.method||null,paymentAmount:paymentByOrder.get(o.id)?.amount||null,paymentSubmittedAt:paymentByOrder.get(o.id)?.submittedAt||null,merchantPayable:Number(o.codTotal.sub(o.deliveryFee)),returnState:returnState.get(o.id)||'PENDING'}))}/>
 </section>;
}
