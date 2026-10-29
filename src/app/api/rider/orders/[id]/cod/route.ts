import {NextResponse} from 'next/server';
import {Prisma} from '@prisma/client';
import {z} from 'zod';
import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
const payload=z.object({amount:z.number().finite().positive().max(100000),confirmed:z.literal(true)});
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const rider=await requireRole(['RIDER']);if(!rider)return NextResponse.json({error:'Rider login required'},{status:403});
 const parsed=payload.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Enter and confirm the exact COD amount'},{status:400});
 const {id}=await params;
 try{
  const result=await db.$transaction(async tx=>{
   const order=await tx.order.findUnique({where:{id},include:{delivery:{include:{rider:true}},codCollection:true}});
   if(!order||order.delivery?.rider.userId!==rider.id)return {error:'Not your assigned order',statusCode:403};
   if(order.status!=='DELIVERED')return {error:'Delivery must be marked delivered before confirming COD collection',statusCode:409};
   const amount=new Prisma.Decimal(parsed.data.amount.toFixed(2));
   if(!amount.eq(order.codTotal))return {error:'Collected amount must exactly match order COD total',statusCode:409};
   if(order.codCollection)return order.codCollection.riderId===order.delivery.riderId?{ok:true,alreadyRecorded:true}:{error:'COD already recorded to another rider',statusCode:409};
   await tx.codCollection.create({data:{orderId:id,riderId:order.delivery.riderId,amount:order.codTotal}});
   await tx.auditLog.create({data:{actorId:rider.id,action:'RIDER_COD_CASH_CONFIRMED',entityType:'Order',entityId:id,metadata:{amount:order.codTotal.toFixed(2),riderId:order.delivery.riderId}}});
   return {ok:true};
  });
  if('error' in result)return NextResponse.json({error:result.error},{status:result.statusCode});
  return NextResponse.json(result);
 }catch(error){
  if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002')return NextResponse.json({error:'COD already recorded'},{status:409});
  console.error('Rider COD confirmation failed',error);
  return NextResponse.json({error:'Could not confirm COD cash'},{status:500});
 }
}
