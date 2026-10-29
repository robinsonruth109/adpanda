import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {riderCommissionSummary} from '@/lib/rider-commission';
import {currentUser} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const user=await currentUser();
 if(!user||user.role!=='RIDER')return NextResponse.json({error:'Rider login required'},{status:403});
 const riderAccount=await db.rider.findUnique({where:{userId:user.id},select:{id:true}});
 const commission=riderAccount?await riderCommissionSummary(db,riderAccount.id):null;
 if(!commission||commission.blocked||commission.daily.some(d=>d.date===commission.today&&Boolean(d.state)))return NextResponse.json({error:'Previous-day platform commission not cleared'},{status:423});
 const {id}=await params;
 try{
 const result=await db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM \`Order\` WHERE id = ${id} FOR UPDATE`;
  const order=await tx.order.findUnique({where:{id},select:{id:true,status:true,dispatchRequestedAt:true,delivery:true}});
  if(!order||order.status!=='PLACED'||!order.dispatchRequestedAt||order.delivery)return {error:'This request is no longer available',code:409};
  const rider=await tx.rider.findUnique({where:{userId:user.id}});
  if(!rider||!rider.approved||rider.status!=='ONLINE')return {error:'You must be approved and online',code:409};
  const latestGps=await tx.riderLocation.findFirst({where:{riderId:rider.id,recordedAt:{gte:new Date(Date.now()-45000)}},select:{id:true}});
  if(!latestGps)return {error:'GPS location is off or stale. Enable live GPS before accepting.',code:409};
  const claimed=await tx.rider.updateMany({where:{id:rider.id,status:'ONLINE',approved:true},data:{status:'BUSY'}});
  if(claimed.count!==1)return {error:'Rider no longer available',code:409};
  await tx.deliveryAssignment.create({data:{orderId:id,riderId:rider.id,assignedById:user.id}});
  await tx.auditLog.create({data:{actorId:user.id,action:'RIDER_FIRST_ACCEPTED',entityType:'Order',entityId:id,metadata:{riderId:rider.id}}});
  return {ok:true,orderId:id,riderId:rider.id};
 });
 if('error' in result)return NextResponse.json({error:result.error},{status:result.code});
 return NextResponse.json(result);
 }catch(error){console.error('Rider request claim failed',error);return NextResponse.json({error:'Request could not be accepted'},{status:500})}
}
