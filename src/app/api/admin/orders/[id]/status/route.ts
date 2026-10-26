import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
import {releaseCancelledOrderStock} from '@/lib/order-inventory';
import type {OrderStatus} from '@prisma/client';

const schema=z.object({status:z.enum(['MERCHANT_ACCEPTED','PREPARING','READY_FOR_PICKUP','PICKED_UP','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','FAILED']),note:z.string().trim().max(500).optional()});
const allowed:Partial<Record<OrderStatus,OrderStatus[]>>={
 PLACED:['MERCHANT_ACCEPTED','CANCELLED'],
 MERCHANT_ACCEPTED:['PREPARING','CANCELLED'],
 PREPARING:['READY_FOR_PICKUP','CANCELLED'],
 READY_FOR_PICKUP:['CANCELLED'],
 RIDER_ASSIGNED:['PICKED_UP','CANCELLED'],
 PICKED_UP:['OUT_FOR_DELIVERY','FAILED'],
 OUT_FOR_DELIVERY:['DELIVERED','FAILED']
};
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
 const admin=await requireRole(['ADMIN']);
 if(!admin)return NextResponse.json({error:'Admin access required'},{status:403});
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Invalid order status or note'},{status:400});
 const {id}=await params,{status,note}=parsed.data;
 try {
  const result=await db.$transaction(async tx=>{
   // Serialize pre-assignment, acceptance, and cancellation for this order.
   await tx.$queryRaw`SELECT id FROM \`Order\` WHERE id = ${id} FOR UPDATE`;
   const order=await tx.order.findUnique({where:{id},include:{delivery:true}});
   if(!order) return {error:'Order not found',code:404};
   if(!allowed[order.status]?.includes(status))return {error:'Invalid status transition from '+order.status+' to '+status,code:409};
   if(['PICKED_UP','OUT_FOR_DELIVERY','DELIVERED','FAILED'].includes(status)&&!order.delivery)return {error:'Assign a rider first',code:409};
   if(status==='MERCHANT_ACCEPTED'&&!order.delivery)return {error:'A rider must be assigned before accepting the order.',code:409};
   if(status==='READY_FOR_PICKUP'&&!order.delivery)return {error:'Rider assignment must be completed first.',code:409};
   const finalStatus=status==='READY_FOR_PICKUP'&&order.delivery?'RIDER_ASSIGNED':status;
   const updated=await tx.order.updateMany({where:{id,status:order.status},data:{status:finalStatus}});
   if(updated.count!==1)return {error:'Order changed, refresh and try again',code:409};
   if(status==='CANCELLED')await releaseCancelledOrderStock(tx,id);
   if(order.delivery){
    if(status==='PICKED_UP')await tx.deliveryAssignment.update({where:{orderId:id},data:{pickedUpAt:new Date()}});
    if(status==='DELIVERED')await tx.deliveryAssignment.update({where:{orderId:id},data:{deliveredAt:new Date()}});
    if(['DELIVERED','FAILED','CANCELLED'].includes(status))
     await tx.rider.updateMany({where:{id:order.delivery.riderId,status:'BUSY'},data:{status:'ONLINE'}});
   }
   if(finalStatus!==status)
    await tx.orderEvent.create({data:{orderId:id,fromStatus:order.status,toStatus:'READY_FOR_PICKUP',actorId:admin.id,note:'Order ready for preassigned rider'}});
   await tx.orderEvent.create({data:{orderId:id,fromStatus:finalStatus!==status?'READY_FOR_PICKUP':order.status,toStatus:finalStatus,actorId:admin.id,note:note||undefined}});
   await tx.auditLog.create({data:{actorId:admin.id,action:'ADMIN_ORDER_STATUS',entityType:'Order',entityId:id,metadata:{from:order.status,to:finalStatus,note:note||null}}});
   return {ok:true,status:finalStatus};
  });
  if('error' in result)return NextResponse.json({error:result.error},{status:result.code});
  return NextResponse.json(result);
 }catch(error){console.error('Admin order status error',error);return NextResponse.json({error:'Could not update order'},{status:500})}
}
