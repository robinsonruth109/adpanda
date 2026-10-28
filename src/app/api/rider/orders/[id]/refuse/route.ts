import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
import {z} from 'zod';
const schema=z.object({reason:z.string().trim().min(5).max(500)});
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const user=await requireRole(['RIDER']);if(!user)return NextResponse.json({error:'Rider login required'},{status:403});
 const input=schema.safeParse(await request.json().catch(()=>null));
 if(!input.success)return NextResponse.json({error:'Enter refusal reason (at least five characters)'},{status:400});
 const {id}=await params;
 const result=await db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM \`Order\` WHERE id = ${id} FOR UPDATE`;
  const order=await tx.order.findUnique({where:{id},include:{delivery:{include:{rider:true}}}});
  if(!order||order.delivery?.rider.userId!==user.id)return {error:'Not your order',code:403};
  if(!['PICKED_UP','OUT_FOR_DELIVERY'].includes(order.status))return {error:'Only an undelivered pickup can be refused',code:409};
  if(await tx.codCollection.findUnique({where:{orderId:id},select:{id:true}}))return {error:'COD already collected',code:409};
  await tx.order.update({where:{id},data:{status:'FAILED'}});
  await tx.orderEvent.create({data:{orderId:id,fromStatus:order.status,toStatus:'FAILED',actorId:user.id,note:'Customer refused parcel: '+input.data.reason}});
  await tx.auditLog.create({data:{actorId:user.id,action:'RIDER_CUSTOMER_REFUSED',entityType:'Order',entityId:id,metadata:{reason:input.data.reason,returnRequired:true}}});
  return {ok:true,returnRequired:true,returnStatus:'AWAITING_RIDER_RETURN',deliveryFeeEarned:0,codCollected:0};
 });
 return NextResponse.json(result,{status:'error'in result?result.code:200});
}
