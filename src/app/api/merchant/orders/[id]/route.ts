import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
import type {OrderStatus} from '@prisma/client';

const transitions:Partial<Record<OrderStatus,OrderStatus[]>>={
 PLACED:['MERCHANT_ACCEPTED','CANCELLED'],
 MERCHANT_ACCEPTED:['PREPARING'],
 PREPARING:['READY_FOR_PICKUP']
};
const schema=z.object({status:z.enum(['MERCHANT_ACCEPTED','PREPARING','READY_FOR_PICKUP','CANCELLED'])});
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const user=await currentUser();
 if(!user)return NextResponse.json({error:'Please sign in'},{status:401});
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Invalid order status'},{status:400});
 const {id}=await params;
 try{
  const result=await db.$transaction(async tx=>{
   const order=await tx.order.findUnique({where:{id},select:{id:true,status:true,kitchen:{select:{merchantId:true,merchant:{select:{status:true,members:{where:{userId:user.id},select:{role:true}}}}}}}});
   if(!order||order.kitchen.merchant.members.length===0||order.kitchen.merchant.status!=='APPROVED')return {error:'Order not found or merchant not authorized',code:403};
   const next=parsed.data.status;
   if(!transitions[order.status]?.includes(next))return {error:'Cannot change this order from '+order.status+' to '+next,code:409};
   const updated=await tx.order.updateMany({where:{id,status:order.status},data:{status:next}});
   if(updated.count!==1)return {error:'Order updated by someone else. Refresh.',code:409};
   await tx.orderEvent.create({data:{orderId:id,fromStatus:order.status,toStatus:next,actorId:user.id,note:next==='CANCELLED'?'Kitchen declined before acceptance':'Kitchen workflow update'}});
   await tx.auditLog.create({data:{actorId:user.id,action:'MERCHANT_ORDER_STATUS',entityType:'Order',entityId:id,metadata:{from:order.status,to:next,merchantId:order.kitchen.merchantId}}});
   return {ok:true,status:next};
  });
  if('error' in result)return NextResponse.json({error:result.error},{status:result.code});
  return NextResponse.json(result);
 }catch(error){console.error('Merchant order update failed',error);return NextResponse.json({error:'Could not update order'},{status:500})}
}
