import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';

const schema=z.object({riderId:z.string().min(1).max(100)}).strict();
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
 const actor=await requireRole(['ADMIN']);
 if(!actor)return NextResponse.json({error:'Forbidden'},{status:403});
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Select a rider'},{status:400});
 const {id}=await params,{riderId}=parsed.data;
 try{
  const result=await db.$transaction(async tx=>{
   const order=await tx.order.findUnique({where:{id},include:{delivery:true}});
   if(!order)return {error:'Order not found',code:404};
   if(order.delivery)return {error:'A rider has already been assigned to this order.',code:409};
   const early=order.status==='PLACED'&&Boolean(order.dispatchRequestedAt);
   const legacy=order.status==='READY_FOR_PICKUP';
   if(!early&&!legacy)return {error:'Merchant must request a rider before Admin assigns one.',code:409};
   const rider=await tx.rider.updateMany({
    where:{id:riderId,approved:true,status:'ONLINE'},data:{status:'BUSY'}
   });
   if(rider.count!==1)return {error:'Rider is not approved, online or available.',code:409};
   // Early reservations keep the order PLACED; ONLY Merchant can accept after rider found.
   if(legacy){
    const changed=await tx.order.updateMany({where:{id,status:'READY_FOR_PICKUP'},data:{status:'RIDER_ASSIGNED'}});
    if(changed.count!==1)return {error:'Order changed. Refresh and try again.',code:409};
   }
   await tx.deliveryAssignment.create({data:{orderId:id,riderId,assignedById:actor.id}});
   await tx.orderEvent.create({data:{orderId:id,fromStatus:order.status,
    toStatus:early?'PLACED':'RIDER_ASSIGNED',actorId:actor.id,
    note:early?'Delivery rider reserved before merchant acceptance':'Manually assigned to rider'}});
   await tx.auditLog.create({data:{actorId:actor.id,action:'ADMIN_RIDER_ASSIGNED',
    entityType:'Order',entityId:id,metadata:{riderId,preAccept:early}}});
   return {ok:true,status:early?'PLACED':'RIDER_ASSIGNED',riderAssigned:true};
  });
  if('error'in result)return NextResponse.json({error:result.error},{status:result.code});
  return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  console.error('Rider assignment error',error);
  return NextResponse.json({error:'Could not assign rider. Refresh and try again.'},{status:500});
 }
}
