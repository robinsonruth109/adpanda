import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';

const schema=z.object({riderId:z.string().min(1).max(100)});
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
 const actor=await requireRole(['ADMIN']);
 if(!actor)return NextResponse.json({error:'Forbidden'},{status:403});
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Select a rider'},{status:400});
 const {id}=await params,{riderId}=parsed.data;
 try{
  await db.$transaction(async tx=>{
   const order=await tx.order.findUnique({where:{id},include:{delivery:true}});
   if(!order)throw Error('Order not found');
   if(order.status!=='READY_FOR_PICKUP'||order.delivery)throw Error('Order must be ready for pickup and unassigned');
   const rider=await tx.rider.updateMany({where:{id:riderId,approved:true,status:'ONLINE'},data:{status:'BUSY'}});
   if(rider.count!==1)throw Error('Rider is not approved, online or available');
   const changed=await tx.order.updateMany({where:{id,status:'READY_FOR_PICKUP'},data:{status:'RIDER_ASSIGNED'}});
   if(changed.count!==1)throw Error('Order changed. Refresh and try again');
   await tx.deliveryAssignment.create({data:{orderId:id,riderId,assignedById:actor.id}});
   await tx.orderEvent.create({data:{orderId:id,fromStatus:'READY_FOR_PICKUP',toStatus:'RIDER_ASSIGNED',actorId:actor.id,note:'Manually assigned to rider'}});
   await tx.auditLog.create({data:{actorId:actor.id,action:'ADMIN_RIDER_ASSIGNED',entityType:'Order',entityId:id,metadata:{riderId}}});
  });
  return NextResponse.json({ok:true,status:'RIDER_ASSIGNED'});
 }catch(error){
  const message=error instanceof Error?error.message:'Assignment failed';
  if(['Order not found','Order must be ready for pickup and unassigned','Rider is not approved, online or available','Order changed. Refresh and try again'].includes(message))return NextResponse.json({error:message},{status:409});
  console.error('Rider assignment error',error);
  return NextResponse.json({error:'Could not assign rider'},{status:500});
 }
}
