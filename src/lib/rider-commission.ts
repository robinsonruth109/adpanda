import 'server-only';
import {Prisma} from '@prisma/client';
type FinanceDb=Pick<Prisma.TransactionClient,'deliveryAssignment'|'auditLog'>;
export function dhakaDate(d:Date){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);const x=(k:string)=>parts.find(p=>p.type===k)?.value||'00';return x('year')+'-'+x('month')+'-'+x('day')}
export async function riderCommissionSummary(db:FinanceDb,riderId:string,now=new Date()){
 const orders=await db.deliveryAssignment.findMany({where:{riderId,order:{status:'DELIVERED'},deliveredAt:{not:null}},select:{orderId:true,deliveredAt:true,order:{select:{commissionAmount:true,deliveryFee:true,codTotal:true}}}});
 const rows=orders.filter(o=>o.deliveredAt).map(o=>({id:o.orderId,date:dhakaDate(o.deliveredAt!),commission:new Prisma.Decimal(o.order.commissionAmount),delivery:new Prisma.Decimal(o.order.deliveryFee)}));
 const days=[...new Set(rows.map(r=>r.date))];
 const payments=await db.auditLog.findMany({where:{entityType:'Rider',entityId:riderId,action:{in:['RIDER_PLATFORM_COMMISSION_SUBMITTED','ADMIN_PLATFORM_COMMISSION_APPROVED']}},orderBy:{createdAt:'asc'},select:{action:true,createdAt:true,metadata:true}});
 const states=new Map<string,{status:'SUBMITTED'|'APPROVED';submittedAt:Date;approvedAt?:Date;proofKey?:string;method?:string}>();
 for(const p of payments){const m=p.metadata;if(!m||typeof m!=='object'||Array.isArray(m)||typeof m.date!=='string')continue;
  const prior=states.get(m.date);
  if(p.action==='RIDER_PLATFORM_COMMISSION_SUBMITTED')states.set(m.date,{status:'SUBMITTED',submittedAt:p.createdAt,proofKey:typeof m.proofKey==='string'?m.proofKey:undefined,method:typeof m.method==='string'?m.method:undefined});
  if(p.action==='ADMIN_PLATFORM_COMMISSION_APPROVED'&&prior)states.set(m.date,{...prior,status:'APPROVED',approvedAt:p.createdAt});
 }
 const today=dhakaDate(now);
 const daily=days.sort().reverse().map(date=>({date,amount:rows.filter(r=>r.date===date).reduce((a,r)=>a.add(r.commission),new Prisma.Decimal(0)),state:states.get(date)}));
 const overdue=daily.filter(d=>d.date<today&&d.amount.gt(0)&&d.state?.status!=='APPROVED');
 return {today,daily,overdue,blocked:overdue.length>0,earningsToday:rows.filter(r=>r.date===today).reduce((a,r)=>a.add(r.delivery),new Prisma.Decimal(0)),commissionToday:daily.find(d=>d.date===today)?.amount||new Prisma.Decimal(0)};
}
