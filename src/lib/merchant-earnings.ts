import 'server-only';
import {Prisma} from '@prisma/client';

type FinanceDb=Pick<Prisma.TransactionClient,'order'|'merchantSettlement'|'cashDeposit'>;
const zero=()=>new Prisma.Decimal(0);
const decimal=(v:Prisma.Decimal|null|undefined)=>new Prisma.Decimal(v??0);
export async function merchantEarnings(db:FinanceDb,merchantId:string){
 const [eligible,awaitingCash,reserved,paid]=await Promise.all([
  db.order.aggregate({where:{kitchen:{merchantId},status:'DELIVERED',codCollection:{isNot:null}},_count:{_all:true},_sum:{foodSubtotal:true,commissionAmount:true,merchantPayable:true}}),
  db.order.aggregate({where:{kitchen:{merchantId},status:'DELIVERED',codCollection:{is:null}},_count:{_all:true},_sum:{merchantPayable:true}}),
  db.merchantSettlement.aggregate({where:{merchantId,status:{in:['PENDING','APPROVED','PAID']}},_sum:{amount:true}}),
  db.merchantSettlement.aggregate({where:{merchantId,status:'PAID'},_sum:{amount:true}})
 ]);
 const gross=decimal(eligible._sum.foodSubtotal);
 const fee=decimal(eligible._sum.commissionAmount);
 const earnings=decimal(eligible._sum.merchantPayable);
 const held=decimal(reserved._sum.amount);
 return {
  eligibleOrders:eligible._count._all,
  pendingCashOrders:awaitingCash._count._all,
  awaitingCash:decimal(awaitingCash._sum.merchantPayable),
  gross,fee,earnings,
  reserved:held,paid:decimal(paid._sum.amount),
  available:Prisma.Decimal.max(zero(),earnings.minus(held))
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
