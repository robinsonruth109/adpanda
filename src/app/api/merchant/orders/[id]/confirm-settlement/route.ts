import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
import {z} from 'zod';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const user=await currentUser();if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
 const input=z.object({reviewedEvidence:z.literal(true),confirmedFundsReceived:z.literal(true)}).strict().safeParse(await request.json().catch(()=>null));
 if(!input.success)return NextResponse.json({error:'Review the proof and verify actual receipt of funds before confirming'},{status:400});
 const {id}=await params;
 const result=await db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM \`Order\` WHERE id = ${id} FOR UPDATE`;
  const order=await tx.order.findUnique({where:{id},include:{kitchen:{include:{merchant:{include:{members:{where:{userId:user.id}}}}}},delivery:true,codCollection:true}});
  if(!order||!order.kitchen.merchant.members.length)return {error:'Not authorized for this merchant',code:403};
  if(order.status!=='DELIVERED'||!order.codCollection||!order.delivery)return {error:'Customer delivery not completed',code:409};
  const submitted=await tx.auditLog.findFirst({where:{entityType:'Order',entityId:id,action:'RIDER_SETTLEMENT_SUBMITTED'},orderBy:{createdAt:'desc'}});
  if(!submitted)return {error:'Rider has not submitted payment evidence',code:409};
  const confirmed=await tx.auditLog.findFirst({where:{entityType:'Order',entityId:id,action:'MERCHANT_SETTLEMENT_CONFIRMED'}});
  if(confirmed)return {ok:true,alreadyConfirmed:true};
  await tx.auditLog.create({data:{actorId:user.id,action:'MERCHANT_SETTLEMENT_CONFIRMED',entityType:'Order',entityId:id,metadata:{submittedId:submitted.id,amount:order.merchantPayable.toFixed(2),riderId:order.delivery.riderId,reviewedEvidence:true,confirmedFundsReceived:true}}});
  await tx.orderEvent.create({data:{orderId:id,fromStatus:'DELIVERED',toStatus:'DELIVERED',actorId:user.id,note:'Merchant verified rider settlement for base payable amount'}});
  await tx.rider.updateMany({where:{id:order.delivery.riderId,status:'BUSY'},data:{status:'OFFLINE'}});
  return {ok:true,verified:true};
 });
 return NextResponse.json(result,{status:'error'in result?result.code:200});
}
