import {NextResponse} from 'next/server';
import {Prisma} from '@prisma/client';
import {z} from 'zod';
import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';

const schema=z.object({
  riderId:z.string().min(1).max(100),
  amount:z.number().finite().positive().max(1000000),
  reference:z.string().trim().min(3).max(100),
  confirmed:z.literal(true)
});
type Failed={error:string;statusCode:number};

export async function POST(request:Request){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
 const admin=await requireRole(['ADMIN']);
 if(!admin)return NextResponse.json({error:'Admin access required'},{status:403});
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Choose a rider, enter an amount and a unique cash handover reference'},{status:400});
 const {riderId,amount,reference}=parsed.data;
 if(!Number.isSafeInteger(Math.round(amount*100))||Math.abs(amount*100-Math.round(amount*100))>0.00001)
  return NextResponse.json({error:'Cash amount must have at most 2 decimal places'},{status:400});
 const cash=new Prisma.Decimal(amount.toFixed(2));
 try{
  const result=await db.$transaction(async tx=>{
   const rider=await tx.rider.findUnique({where:{id:riderId},select:{id:true,user:{select:{name:true}}}});
   if(!rider)return {error:'Rider not found',statusCode:404} satisfies Failed;
   const earlier=await tx.cashDeposit.findUnique({where:{reference},select:{id:true}});
   if(earlier)return {error:'This cash handover reference has already been recorded',statusCode:409} satisfies Failed;
   const [collected,deposited]=await Promise.all([
    tx.codCollection.aggregate({where:{riderId},_sum:{amount:true}}),
    tx.cashDeposit.aggregate({where:{riderId},_sum:{amount:true}})
   ]);
   const totalReceived=new Prisma.Decimal(collected._sum.amount??0);
   const totalDeposited=new Prisma.Decimal(deposited._sum.amount??0);
   const outstanding=totalReceived.minus(totalDeposited);
   if(outstanding.lt(cash))
    return {error:'Cash deposit exceeds the rider outstanding COD amount',statusCode:409} satisfies Failed;
   const deposit=await tx.cashDeposit.create({data:{riderId,amount:cash,receivedById:admin.id,reference}});
   await tx.auditLog.create({data:{actorId:admin.id,action:'ADMIN_RIDER_COD_DEPOSIT_RECORDED',entityType:'CashDeposit',entityId:deposit.id,metadata:{
    riderId,amount:cash.toFixed(2),reference,previousOutstanding:outstanding.toFixed(2),
    outstandingAfter:outstanding.minus(cash).toFixed(2)
   }}});
   return {ok:true,depositId:deposit.id,reference,outstandingAfter:outstanding.minus(cash).toFixed(2)};
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:10000,timeout:15000});
  if('error' in result)return NextResponse.json({error:result.error},{status:result.statusCode});
  return NextResponse.json(result,{status:201});
 }catch(error){
  if(error instanceof Prisma.PrismaClientKnownRequestError){
   if(error.code==='P2002')return NextResponse.json({error:'This handover reference has already been used'},{status:409});
   if(error.code==='P2034')return NextResponse.json({error:'Concurrent cash update detected. Refresh and try again.'},{status:409});
  }
  console.error('Failed to record COD deposit',error);
  return NextResponse.json({error:'Could not record cash handover. No cash receipt confirmed.'},{status:500});
 }
}
