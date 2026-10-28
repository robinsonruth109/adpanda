import {NextResponse} from 'next/server';
import {GetObjectCommand,S3Client} from '@aws-sdk/client-s3';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const user=await currentUser();
 if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
 const {id}=await params;
 const order=await db.order.findUnique({where:{id},select:{kitchen:{select:{merchant:{select:{members:{where:{userId:user.id},select:{userId:true}}}}}}}});
 if(!order?.kitchen.merchant.members.length)return NextResponse.json({error:'Not authorized'},{status:403});
 const evidence=await db.auditLog.findFirst({where:{entityType:'Order',entityId:id,action:'RIDER_SETTLEMENT_SUBMITTED'},orderBy:{createdAt:'desc'},select:{metadata:true}});
 const meta=evidence?.metadata;
 if(!meta||typeof meta!=='object'||Array.isArray(meta))return NextResponse.json({error:'Evidence unavailable'},{status:404});
 const key=meta.proofKey;
 if(typeof key!=='string'||!key.startsWith('settlement-proof/'+id+'/'))return NextResponse.json({error:'Invalid evidence reference'},{status:404});
 const bucket=process.env.BUCKET_NAME,endpoint=process.env.BUCKET_ENDPOINT,accessKeyId=process.env.BUCKET_ACCESS_KEY_ID,secretAccessKey=process.env.BUCKET_SECRET_ACCESS_KEY;
 if(!bucket||!endpoint||!accessKeyId||!secretAccessKey)return NextResponse.json({error:'Storage unavailable'},{status:503});
 try{
  const client=new S3Client({region:process.env.BUCKET_REGION||'auto',endpoint,forcePathStyle:process.env.BUCKET_FORCE_PATH_STYLE==='true',credentials:{accessKeyId,secretAccessKey}});
  const file=await client.send(new GetObjectCommand({Bucket:bucket,Key:key}));
  const mime=file.ContentType;
  if(!mime||!['image/jpeg','image/png','image/webp'].includes(mime)||!file.Body)return NextResponse.json({error:'Invalid evidence type'},{status:415});
  const bytes=await file.Body.transformToByteArray();
  return new NextResponse(new Uint8Array(bytes),{headers:{'Content-Type':mime,'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','Content-Disposition':'inline; filename="payment-proof"'}});
 }catch(err){console.error('Settlement proof read failed',err);return NextResponse.json({error:'Could not read evidence'},{status:502})}
}
