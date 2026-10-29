import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
import {S3Client,PutObjectCommand} from '@aws-sdk/client-s3';
import {randomUUID} from 'node:crypto';
export const runtime='nodejs';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const user=await requireRole(['RIDER']);if(!user)return NextResponse.json({error:'Rider login required'},{status:403});
 const {id}=await params;
 const order=await db.order.findUnique({where:{id},include:{delivery:{include:{rider:true}},codCollection:true}});
 if(!order||order.delivery?.rider.userId!==user.id)return NextResponse.json({error:'Not your delivery'},{status:403});
 if(!['PICKED_UP','OUT_FOR_DELIVERY'].includes(order.status))return NextResponse.json({error:'Parcel must be picked up before handover'},{status:409});
 const bucket=process.env.BUCKET_NAME,endpoint=process.env.BUCKET_ENDPOINT,accessKeyId=process.env.BUCKET_ACCESS_KEY_ID,secretAccessKey=process.env.BUCKET_SECRET_ACCESS_KEY;
 if(!bucket||!endpoint||!accessKeyId||!secretAccessKey)return NextResponse.json({error:'Photo storage unavailable'},{status:503});
 const form=await request.formData().catch(()=>null);
 const file=form?.get('handoverPhoto');
 if(!(file instanceof File)||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size<100||file.size>5*1024*1024)return NextResponse.json({error:'Valid delivery handover photo required (max 5 MB)'},{status:400});
 const bytes=Buffer.from(await file.arrayBuffer());
 const valid=file.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216:file.type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
 if(!valid)return NextResponse.json({error:'Invalid image file'},{status:400});
 const key='delivery-proof/'+id+'/'+randomUUID()+'-customer.'+(file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg');
 try{
  const s3=new S3Client({region:process.env.BUCKET_REGION||'auto',endpoint,forcePathStyle:process.env.BUCKET_FORCE_PATH_STYLE==='true',credentials:{accessKeyId,secretAccessKey}});
  await s3.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:bytes,ContentType:file.type}));
  const result=await db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM \`Order\` WHERE id = ${id} FOR UPDATE`;
   const updated=await tx.order.updateMany({where:{id,status:{in:['PICKED_UP','OUT_FOR_DELIVERY']}},data:{status:'DELIVERED'}});
   if(updated.count!==1)return false;
   await tx.deliveryAssignment.update({where:{orderId:id},data:{deliveredAt:new Date()}});
   const recent=await tx.riderLocation.findFirst({where:{riderId:order.delivery!.riderId,recordedAt:{gte:new Date(Date.now()-45000)}},select:{id:true}});
   await tx.rider.updateMany({where:{id:order.delivery!.riderId,status:'BUSY'},data:{status:recent?'ONLINE':'OFFLINE'}});
   await tx.codCollection.create({data:{orderId:id,riderId:order.delivery!.riderId,amount:order.codTotal}});
   await tx.orderEvent.create({data:{orderId:id,fromStatus:order.status,toStatus:'DELIVERED',actorId:user.id,note:'Customer received parcel, COD collected and delivery photograph uploaded'}});
   await tx.auditLog.create({data:{actorId:user.id,action:'RIDER_CUSTOMER_HANDOVER',entityType:'Order',entityId:id,metadata:{photoKey:key,cod:order.codTotal.toFixed(2)}}});
   return true;
  });
  if(!result)return NextResponse.json({error:'Order already processed, refresh'},{status:409});
  return NextResponse.json({ok:true,status:'DELIVERED'});
 }catch(e){console.error('Customer handover failed',e);return NextResponse.json({error:'Could not complete handover'},{status:500})}
}
