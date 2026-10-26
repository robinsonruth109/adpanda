import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import {isTrustedMutation} from '@/lib/request-security';
import {S3Client,PutObjectCommand} from '@aws-sdk/client-s3';
import {randomUUID} from 'node:crypto';

export const runtime='nodejs';
const allowed=new Set(['image/jpeg','image/png','image/webp']);
async function photo(value:FormDataEntryValue|null){
 if(!(value instanceof File)||!allowed.has(value.type)||value.size<100||value.size>5*1024*1024)throw Error('Both JPG, PNG or WebP photos are required (maximum 5 MB each)');
 const bytes=Buffer.from(await value.arrayBuffer());
 const valid=value.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216:
  value.type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):
  bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
 if(!valid)throw Error('Invalid image file');
 return {bytes,mime:value.type};
}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const user=await currentUser();if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
 const {id}=await params;
 const order=await db.order.findUnique({where:{id},select:{status:true,delivery:{select:{riderId:true}},kitchen:{select:{merchant:{select:{members:{where:{userId:user.id},select:{userId:true}}}}}}}});
 if(!order||!order.kitchen.merchant.members.length)return NextResponse.json({error:'Not authorized'},{status:403});
 if(order.status!=='RIDER_ASSIGNED'||!order.delivery)return NextResponse.json({error:'Mark parcel ready and have an assigned rider before dispatch'},{status:409});
 const bucket=process.env.BUCKET_NAME,endpoint=process.env.BUCKET_ENDPOINT,accessKeyId=process.env.BUCKET_ACCESS_KEY_ID,secretAccessKey=process.env.BUCKET_SECRET_ACCESS_KEY;
 if(!bucket||!endpoint||!accessKeyId||!secretAccessKey)return NextResponse.json({error:'Private photo storage is not configured'},{status:503});
 let parcel,handover;
 try{
  const body=await request.formData();
  [parcel,handover]=await Promise.all([photo(body.get('parcelPhoto')),photo(body.get('handoverPhoto'))]);
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Invalid photographs'},{status:400})}
 const client=new S3Client({region:process.env.BUCKET_REGION||'auto',endpoint,forcePathStyle:process.env.BUCKET_FORCE_PATH_STYLE==='true',credentials:{accessKeyId,secretAccessKey}});
 const suffix=(mime:string)=>mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg';
 const parcelKey='delivery-proof/'+id+'/'+randomUUID()+'-parcel.'+suffix(parcel.mime);
 const handoverKey='delivery-proof/'+id+'/'+randomUUID()+'-handover.'+suffix(handover.mime);
 try{
  await Promise.all([
   client.send(new PutObjectCommand({Bucket:bucket,Key:parcelKey,Body:parcel.bytes,ContentType:parcel.mime})),
   client.send(new PutObjectCommand({Bucket:bucket,Key:handoverKey,Body:handover.bytes,ContentType:handover.mime}))
  ]);
  const changed=await db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM \`Order\` WHERE id = ${id} FOR UPDATE`;
   const updated=await tx.order.updateMany({where:{id,status:'RIDER_ASSIGNED'},data:{status:'PICKED_UP'}});
   if(updated.count!==1)return false;
   await tx.orderEvent.create({data:{orderId:id,fromStatus:'RIDER_ASSIGNED',toStatus:'PICKED_UP',actorId:user.id,note:'Merchant dispatched order with parcel and rider handover photographs'}});
   await tx.auditLog.create({data:{actorId:user.id,action:'MERCHANT_DISPATCH_PROOF',entityType:'Order',entityId:id,metadata:{parcelKey,handoverKey,riderId:order.delivery!.riderId}}});
   return true;
  });
  if(!changed)return NextResponse.json({error:'Order status changed, please refresh'},{status:409});
  return NextResponse.json({ok:true,status:'PICKED_UP'});
 }catch(error){console.error('Dispatch photo upload failed',error);return NextResponse.json({error:'Could not securely save handover photographs'},{status:500})}
}
