import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
import {storeReturnPhoto} from '@/lib/return-photo';
export const runtime='nodejs';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const user=await currentUser();if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
 const {id}=await params;
 const order=await db.order.findUnique({where:{id},select:{status:true,codCollection:{select:{id:true}},delivery:{select:{riderId:true}},kitchen:{select:{merchant:{select:{members:{where:{userId:user.id},select:{userId:true}}}}}}}});
 if(!order?.kitchen.merchant.members.length)return NextResponse.json({error:'Not authorized for this merchant'},{status:403});
 if(order.status!=='FAILED'||order.codCollection||!order.delivery)return NextResponse.json({error:'No eligible failed return'},{status:409});
 const evidence=await db.auditLog.findFirst({where:{entityType:'Order',entityId:id,action:'RIDER_RETURN_SUBMITTED'},select:{id:true}});
 if(!evidence)return NextResponse.json({error:'Rider must first upload parcel return evidence'},{status:409});
 const body=await request.formData().catch(()=>null);
 let key:string;
 try{key=await storeReturnPhoto(body?.get('receivedPhoto')||null,id,'merchant')}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Invalid photo'},{status:400})}
 try{
 const result=await db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM \`Order\` WHERE id = ${id} FOR UPDATE`;
  const received=await tx.auditLog.findFirst({where:{entityType:'Order',entityId:id,action:'MERCHANT_RETURN_RECEIVED'},select:{id:true}});
  if(received)return {error:'Return already closed',code:409};
  const returned=await tx.auditLog.findFirst({where:{entityType:'Order',entityId:id,action:'RIDER_RETURN_SUBMITTED'},select:{id:true}});
  if(!returned)return {error:'No rider return evidence',code:409};
  const current=await tx.order.findUnique({where:{id},select:{status:true,codCollection:{select:{id:true}}}});
  if(current?.status!=='FAILED'||current.codCollection)return {error:'Order cannot close as return',code:409};
  await tx.auditLog.create({data:{actorId:user.id,action:'MERCHANT_RETURN_RECEIVED',entityType:'Order',entityId:id,metadata:{photoKey:key,riderReturnId:returned.id,deliveryFeeEarned:'0.00',codCollected:'0.00',merchantPayment:'0.00'}}});
  await tx.orderEvent.create({data:{orderId:id,fromStatus:'FAILED',toStatus:'FAILED',actorId:user.id,note:'Return received by merchant and order closed. No delivery fee and no COD transaction.'}});
  const recentGps=await tx.riderLocation.findFirst({where:{riderId:order.delivery!.riderId,recordedAt:{gte:new Date(Date.now()-45000)}},select:{id:true}});
  await tx.rider.updateMany({where:{id:order.delivery!.riderId,status:'BUSY'},data:{status:recentGps?'ONLINE':'OFFLINE'}});
  return {ok:true,returnClosed:true};
 });
 return NextResponse.json(result,{status:'error'in result?result.code:200});
 }catch(e){console.error('Merchant return confirmation failed',e);return NextResponse.json({error:'Could not confirm returned parcel'},{status:500})}
}
