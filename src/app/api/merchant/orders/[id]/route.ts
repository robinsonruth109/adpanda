import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
import {releaseCancelledOrderStock} from '@/lib/order-inventory';
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
   // Serialize pre-assignment, acceptance, and cancellation for this order.
   await tx.$queryRaw`SELECT id FROM \`Order\` WHERE id = ${id} FOR UPDATE`;
   const order=await tx.order.findUnique({where:{id},select:{id:true,status:true,delivery:{select:{riderId:true}},kitchen:{select:{merchantId:true,merchant:{select:{status:true,members:{where:{userId:user.id},select:{role:true}}}}}}}});
   if(!order||order.kitchen.merchant.members.length===0||order.kitchen.merchant.status!=='APPROVED')return {error:'Order not found or merchant not authorized',code:403};
   const next=parsed.data.status;
   if(!transitions[order.status]?.includes(next))return {error:'Cannot change this order from '+order.status+' to '+next,code:409};
   if(next==='MERCHANT_ACCEPTED'&&!order.delivery)return {error:'Find a delivery man first. Waiting for Admin to assign an available rider.',code:409};
   if(next==='READY_FOR_PICKUP'&&!order.delivery)return {error:'Rider must be assigned before marking ready.',code:409};
   const savedStatus=next==='READY_FOR_PICKUP'?'RIDER_ASSIGNED':next;
   const updated=await tx.order.updateMany({where:{id,status:order.status},data:{status:savedStatus}});
   if(updated.count!==1)return {error:'Order updated by someone else. Refresh.',code:409};
   if(next==='CANCELLED'){
    await releaseCancelledOrderStock(tx,id);
    if(order.delivery){
     await tx.rider.updateMany({where:{id:order.delivery.riderId,status:'BUSY'},data:{status:'ONLINE'}});
    }
   }
   if(next==='READY_FOR_PICKUP'){
    await tx.orderEvent.create({data:{orderId:id,fromStatus:order.status,toStatus:'READY_FOR_PICKUP',actorId:user.id,note:'Merchant marked order ready for rider'}});
   }
   await tx.orderEvent.create({data:{orderId:id,fromStatus:next==='READY_FOR_PICKUP'?'READY_FOR_PICKUP':order.status,toStatus:savedStatus,actorId:user.id,note:next==='CANCELLED'?'Kitchen declined before acceptance':next==='READY_FOR_PICKUP'?'Prepared order released to preassigned delivery rider':'Merchant workflow update'}});
   await tx.auditLog.create({data:{actorId:user.id,action:'MERCHANT_ORDER_STATUS',entityType:'Order',entityId:id,metadata:{from:order.status,to:savedStatus,merchantId:order.kitchen.merchantId}}});
   return {ok:true,status:savedStatus};
  });
  if('error' in result)return NextResponse.json({error:result.error},{status:result.code});
  return NextResponse.json(result);
 }catch(error){console.error('Merchant order update failed',error);return NextResponse.json({error:'Could not update order'},{status:500})}
}
