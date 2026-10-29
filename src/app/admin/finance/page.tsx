import {Prisma} from '@prisma/client';
import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
import AdminCashReconciliation from '@/components/admin-cash-reconciliation';
export const dynamic='force-dynamic';
const zero=()=>new Prisma.Decimal(0);
export default async function Page(){
 const admin=await requireRole(['ADMIN']);
 if(!admin)return <main className="admin-workspace"><h1>Admin access required</h1></main>;
 const [riders,collectionsByRider,depositsByRider,latestDeposits,latestCollections,settlements,awaitingCod]=await Promise.all([
  db.rider.findMany({select:{id:true,user:{select:{name:true,phone:true}}},orderBy:{user:{name:'asc'}},take:200}),
  db.codCollection.groupBy({by:['riderId'],_sum:{amount:true}}),
  db.cashDeposit.groupBy({by:['riderId'],_sum:{amount:true}}),
  db.cashDeposit.findMany({take:50,orderBy:{createdAt:'desc'},include:{rider:{select:{user:{select:{name:true}}}}}}),
  db.codCollection.findMany({take:50,orderBy:{collectedAt:'desc'},include:{order:{select:{code:true}},rider:{select:{user:{select:{name:true}}}}}}),
  db.merchantSettlement.findMany({take:50,orderBy:{createdAt:'desc'},include:{merchant:{select:{name:true}}}}),
  db.order.count({where:{status:'DELIVERED',codCollection:{is:null}}})
 ]);
 const riderPayments=await db.auditLog.findMany({where:{entityType:'Order',action:{in:['RIDER_SETTLEMENT_SUBMITTED','MERCHANT_SETTLEMENT_CONFIRMED']}},orderBy:{createdAt:'desc'},take:300,select:{id:true,entityId:true,action:true,createdAt:true,metadata:true}});
 const paymentOrderIds=[...new Set(riderPayments.map(p=>p.entityId))];
 const paymentOrders=paymentOrderIds.length?await db.order.findMany({where:{id:{in:paymentOrderIds}},select:{id:true,code:true,codTotal:true,deliveryFee:true,kitchen:{select:{name:true,merchant:{select:{name:true}}}},delivery:{select:{rider:{select:{user:{select:{name:true}}}}}}}}):[];
 const paymentOrderMap=new Map(paymentOrders.map(o=>[o.id,o]));
 const paymentState=new Map<string,{submittedAt:string|null;confirmedAt:string|null;method:string;amount:string;confirmationId:string|null}>();
 for(const log of [...riderPayments].reverse()){
  const previous=paymentState.get(log.entityId)||{submittedAt:null,confirmedAt:null,method:'—',amount:'0.00',confirmationId:null};
  const metadata=log.metadata&&typeof log.metadata==='object'&&!Array.isArray(log.metadata)?log.metadata:null;
  if(log.action==='RIDER_SETTLEMENT_SUBMITTED'){
   previous.submittedAt=log.createdAt.toISOString();
   previous.method=typeof metadata?.method==='string'?metadata.method:'—';
   previous.amount=typeof metadata?.amount==='string'?metadata.amount:previous.amount;
  }else{
   previous.confirmedAt=log.createdAt.toISOString();
   previous.confirmationId=log.id;
  }
  paymentState.set(log.entityId,previous);
 }
 const riderMerchantSettlements=[...paymentState.entries()].flatMap(([orderId,payment])=>{
  const order=paymentOrderMap.get(orderId);if(!order)return [];
  return [{id:orderId,orderCode:order.code,merchant:order.kitchen.merchant.name,kitchen:order.kitchen.name,rider:order.delivery?.rider.user.name||'Unknown rider',cod:order.codTotal.toFixed(2),deliveryCharge:order.deliveryFee.toFixed(2),amount:order.codTotal.sub(order.deliveryFee).toFixed(2),method:payment.method,status:payment.confirmedAt?'CLEARED':'AWAITING_MERCHANT',submittedAt:payment.submittedAt,confirmedAt:payment.confirmedAt,confirmationId:payment.confirmationId}];
 }).sort((a,b)=>(b.confirmedAt||b.submittedAt||'').localeCompare(a.confirmedAt||a.submittedAt||'')).slice(0,100);
 const collected=new Map(collectionsByRider.map(r=>[r.riderId,new Prisma.Decimal(r._sum.amount??0)]));
 const deposited=new Map(depositsByRider.map(r=>[r.riderId,new Prisma.Decimal(r._sum.amount??0)]));
 const sum=(map:Map<string,Prisma.Decimal>)=>[...map.values()].reduce((n,v)=>n.add(v),zero()).toFixed(2);
 return <section className="adp-finance-page"><div className="admin-breadcrumb">Finance / <strong>COD reconciliation</strong></div><span className="admin-overline">ADPANDA FINANCE</span><h1>Cash & COD reconciliation</h1><p className="muted">Trace rider-confirmed collections, record cash physically received by Admin and compare merchant settlements.</p>
  <AdminCashReconciliation
   riders={riders.map(r=>{
    const c=collected.get(r.id)??zero(),d=deposited.get(r.id)??zero();
    return {id:r.id,name:r.user.name,phone:r.user.phone,collected:c.toFixed(2),deposited:d.toFixed(2),outstanding:c.minus(d).toFixed(2)};
   })}
   deposits={latestDeposits.map(d=>({id:d.id,rider:d.rider.user.name,amount:d.amount.toFixed(2),reference:d.reference||'—',createdAt:d.createdAt.toISOString()}))}
   collections={latestCollections.map(c=>({id:c.id,orderCode:c.order.code,rider:c.rider.user.name,amount:c.amount.toFixed(2),createdAt:c.collectedAt.toISOString()}))}
   riderMerchantSettlements={riderMerchantSettlements}
   settlements={settlements.map(s=>({id:s.id,merchant:s.merchant.name,amount:s.amount.toFixed(2),status:s.status,reference:s.reference,createdAt:s.createdAt.toISOString()}))}
   totalCollected={sum(collected)} totalDeposited={sum(deposited)} deliveredAwaitingCod={awaitingCod}
  />
 </section>;
}
