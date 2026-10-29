import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';

/** Admin can release and replace a reserved rider before merchant acceptance. */
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
 const admin=await requireRole(['ADMIN']);
 if(!admin)return NextResponse.json({error:'Admin access required'},{status:403});
 const {id}=await params;
 try{
  const result=await db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM \`Order\` WHERE id = ${id} FOR UPDATE`;
   const order=await tx.order.findUnique({where:{id},include:{delivery:true}});
   if(!order||order.status!=='PLACED'||!order.delivery)
    return {error:'Only unaccepted orders with a reserved rider can be released.',code:409};
   const riderId=order.delivery.riderId;
   await tx.deliveryAssignment.delete({where:{orderId:id}});
   await tx.rider.updateMany({where:{id:riderId,status:'BUSY'},data:{status:'ONLINE'}});
   await tx.orderEvent.create({data:{orderId:id,fromStatus:'PLACED',toStatus:'PLACED',actorId:admin.id,note:'Rider reservation released; dispatch request remains pending'}});
   await tx.auditLog.create({data:{actorId:admin.id,action:'ADMIN_PREACCEPT_RIDER_RELEASED',entityType:'Order',entityId:id,metadata:{riderId}}});
   return {ok:true,status:'PLACED'};
  });
  if('error'in result)return NextResponse.json({error:result.error},{status:result.code});
  return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(error){console.error('Rider release failed',error);return NextResponse.json({error:'Could not release rider'},{status:500})}
}
