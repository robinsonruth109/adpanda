import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {S3Client,PutObjectCommand} from '@aws-sdk/client-s3';
import {requireRole} from '@/lib/auth';
import {db} from '@/lib/db';
import {isTrustedMutation} from '@/lib/request-security';
import {riderCommissionSummary} from '@/lib/rider-commission';
export const runtime='nodejs';
export async function POST(request:Request){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const user=await requireRole(['RIDER']);if(!user)return NextResponse.json({error:'Rider sign-in required'},{status:403});
 const rider=await db.rider.findUnique({where:{userId:user.id},select:{id:true}});if(!rider)return NextResponse.json({error:'Rider not found'},{status:404});
 const data=await request.formData().catch(()=>null);const date=data?.get('date'),method=data?.get('method'),file=data?.get('proof');
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!['BKASH','CASH'].includes(String(method)))return NextResponse.json({error:'Invalid date or method'},{status:400});
 const wallet=await riderCommissionSummary(db,rider.id);const day=wallet.daily.find(d=>d.date===date);
 if(!day||day.amount.lte(0)||date>wallet.today)return NextResponse.json({error:'No eligible AdPanda commission due for this date'},{status:409});
 if(day.state)return NextResponse.json({error:'A submission already exists for this date; contact Admin for review'},{status:409});
 if(!(file instanceof File)||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size<100||file.size>5*1024*1024)return NextResponse.json({error:'Payment proof image required (max 5 MB)'},{status:400});
 const bytes=Buffer.from(await file.arrayBuffer());const valid=file.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216:file.type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
 if(!valid)return NextResponse.json({error:'Invalid image bytes'},{status:400});
 const bucket=process.env.BUCKET_NAME,endpoint=process.env.BUCKET_ENDPOINT,accessKeyId=process.env.BUCKET_ACCESS_KEY_ID,secretAccessKey=process.env.BUCKET_SECRET_ACCESS_KEY;
 if(!bucket||!endpoint||!accessKeyId||!secretAccessKey)return NextResponse.json({error:'Photo storage unavailable'},{status:503});
 const key='platform-commission/'+rider.id+'/'+date+'/'+randomUUID()+'.'+(file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg');
 try{
  const client=new S3Client({region:process.env.BUCKET_REGION||'auto',endpoint,forcePathStyle:process.env.BUCKET_FORCE_PATH_STYLE==='true',credentials:{accessKeyId,secretAccessKey}});
  await client.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:bytes,ContentType:file.type}));
  const result=await db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM \`Rider\` WHERE id = ${rider.id} FOR UPDATE`;
   const previous=await tx.auditLog.findFirst({where:{entityType:'Rider',entityId:rider.id,action:'RIDER_PLATFORM_COMMISSION_SUBMITTED'},orderBy:{createdAt:'desc'}});
   if(previous?.metadata&&typeof previous.metadata==='object'&&!Array.isArray(previous.metadata)&&previous.metadata.date===date)return false;
   await tx.auditLog.create({data:{actorId:user.id,entityType:'Rider',entityId:rider.id,action:'RIDER_PLATFORM_COMMISSION_SUBMITTED',metadata:{date,amount:day.amount.toFixed(2),method,proofKey:key}}});return true;
  });
  if(!result)return NextResponse.json({error:'Already submitted'},{status:409});
  return NextResponse.json({ok:true,pendingAdminApproval:true});
 }catch(e){console.error('Commission proof failed',e);return NextResponse.json({error:'Unable to submit commission proof'},{status:500})}
}
