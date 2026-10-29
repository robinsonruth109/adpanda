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
 if(!order||order.delivery?.rider.userId!==user.id)return NextResponse.json({error:'Not your order'},{status:403});
 if(order.status!=='DELIVERED'||!order.codCollection)return NextResponse.json({error:'Customer handover and COD collection must complete first'},{status:409});
 const previous=await db.auditLog.findFirst({where:{entityType:'Order',entityId:id,action:{in:['RIDER_SETTLEMENT_SUBMITTED','MERCHANT_SETTLEMENT_CONFIRMED']}},orderBy:{createdAt:'desc'}});
 if(previous?.action==='MERCHANT_SETTLEMENT_CONFIRMED')return NextResponse.json({error:'Payment already cleared'},{status:409});
 if(previous?.action==='RIDER_SETTLEMENT_SUBMITTED')return NextResponse.json({error:'Payment already submitted; awaiting merchant verification'},{status:409});
 const form=await request.formData().catch(()=>null),method=form?.get('method'),file=form?.get('proof');
 if(method!=='BKASH'&&method!=='CASH')return NextResponse.json({error:'Select bKash or cash'},{status:400});
 if(!(file instanceof File)||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size<100||file.size>5*1024*1024)return NextResponse.json({error:'Payment evidence photo required (max 5MB)'},{status:400});
 const bytes=Buffer.from(await file.arrayBuffer());
 const valid=file.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216:file.type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
 if(!valid)return NextResponse.json({error:'Invalid image content'},{status:400});
 const bucket=process.env.BUCKET_NAME,endpoint=process.env.BUCKET_ENDPOINT,accessKeyId=process.env.BUCKET_ACCESS_KEY_ID,secretAccessKey=process.env.BUCKET_SECRET_ACCESS_KEY;
 if(!bucket||!endpoint||!accessKeyId||!secretAccessKey)return NextResponse.json({error:'Private storage unavailable'},{status:503});
 const key='settlement-proof/'+id+'/'+randomUUID()+'.'+(file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg');
 try{
  const client=new S3Client({endpoint,region:process.env.BUCKET_REGION||'auto',forcePathStyle:process.env.BUCKET_FORCE_PATH_STYLE==='true',credentials:{accessKeyId,secretAccessKey}});
  await client.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:bytes,ContentType:file.type}));
  await db.auditLog.create({data:{actorId:user.id,action:'RIDER_SETTLEMENT_SUBMITTED',entityType:'Order',entityId:id,metadata:{proofKey:key,method,amount:order.codTotal.sub(order.deliveryFee).sub(order.commissionAmount).toFixed(2),customerCod:order.codTotal.toFixed(2),deliveryCharge:order.deliveryFee.toFixed(2),platformCommission:order.commissionAmount.toFixed(2),riderId:order.delivery!.riderId}}});
  return NextResponse.json({ok:true,pendingMerchantConfirmation:true});
 }catch(e){console.error('Settlement evidence upload failed',e);return NextResponse.json({error:'Could not submit settlement evidence'},{status:500})}
}
