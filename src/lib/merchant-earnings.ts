import 'server-only';
import {Prisma} from '@prisma/client';

type FinanceDb=Pick<Prisma.TransactionClient,'order'|'merchantSettlement'|'cashDeposit'|'auditLog'>;
const zero=()=>new Prisma.Decimal(0);
const decimal=(v:Prisma.Decimal|null|undefined)=>new Prisma.Decimal(v??0);
export async function merchantEarnings(db:FinanceDb,merchantId:string){
 const [eligible,awaitingCash,reserved,paid,riderOrders]=await Promise.all([
  db.order.aggregate({where:{kitchen:{merchantId},status:'DELIVERED',codCollection:{isNot:null}},_count:{_all:true},_sum:{foodSubtotal:true,commissionAmount:true,merchantPayable:true}}),
  db.order.aggregate({where:{kitchen:{merchantId},status:'DELIVERED',codCollection:{is:null}},_count:{_all:true},_sum:{merchantPayable:true}}),
  db.merchantSettlement.aggregate({where:{merchantId,status:{in:['PENDING','APPROVED','PAID']}},_sum:{amount:true}}),
  db.merchantSettlement.aggregate({where:{merchantId,status:'PAID'},_sum:{amount:true}}),
  db.order.findMany({where:{kitchen:{merchantId},status:'DELIVERED',codCollection:{isNot:null},delivery:{isNot:null}},select:{id:true,merchantPayable:true,codTotal:true,deliveryFee:true}})
 ]);
 const gross=decimal(eligible._sum.foodSubtotal);
 const fee=decimal(eligible._sum.commissionAmount);
 const earnings=decimal(eligible._sum.merchantPayable);
 // Delivered rider-assigned orders use direct rider-to-merchant settlement, never Admin payout.
 // Exclude ALL such orders, including those still awaiting rider payment, to prevent double claims.
 const riderOrderIds=riderOrders.map(o=>o.id);
 const riderEvents=riderOrderIds.length?await db.auditLog.findMany({where:{entityType:'Order',entityId:{in:riderOrderIds},action:{in:['RIDER_SETTLEMENT_SUBMITTED','MERCHANT_SETTLEMENT_CONFIRMED']}},select:{entityId:true,action:true}}):[];
 const paymentState=new Map<string,string>();
 for(const event of riderEvents)if(event.action==='MERCHANT_SETTLEMENT_CONFIRMED'||!paymentState.has(event.entityId))paymentState.set(event.entityId,event.action);
 const directPaid=riderOrders.filter(o=>paymentState.get(o.id)==='MERCHANT_SETTLEMENT_CONFIRMED').reduce((n,o)=>n.add(o.codTotal.sub(o.deliveryFee)),zero());
 const directPending=riderOrders.filter(o=>paymentState.get(o.id)!=='MERCHANT_SETTLEMENT_CONFIRMED').reduce((n,o)=>n.add(o.codTotal.sub(o.deliveryFee)),zero());
 const riderExcluded=riderOrders.reduce((n,o)=>n.add(o.merchantPayable),zero());
 const platformEligible=Prisma.Decimal.max(zero(),earnings.minus(riderExcluded));
 const held=decimal(reserved._sum.amount);
 return {
  eligibleOrders:eligible._count._all,
  pendingCashOrders:awaitingCash._count._all,
  awaitingCash:decimal(awaitingCash._sum.merchantPayable),
  gross,fee,earnings,
  reserved:held,paid:decimal(paid._sum.amount),directPaid,directPending,platformEligible,
  available:Prisma.Decimal.max(zero(),platformEligible.minus(held))
 };
}
export async function unallocatedCashLiquidity(db:FinanceDb){
 const [deposits,paid]=await Promise.all([
  db.cashDeposit.aggregate({_sum:{amount:true}}),
  db.merchantSettlement.aggregate({where:{status:'PAID'},_sum:{amount:true}})
 ]);
 // This is only an upper bound based on recorded rider deposits, not an actual bank balance.
 return decimal(deposits._sum.amount).minus(decimal(paid._sum.amount));
}
