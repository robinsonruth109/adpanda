import {NextResponse} from 'next/server';
import {GetObjectCommand,S3Client} from '@aws-sdk/client-s3';
import {requireRole} from '@/lib/auth';
import {db} from '@/lib/db';
export const runtime='nodejs';
export async function GET(_req:Request,{params}:{params:Promise<{riderId:string;date:string}>}){
 const admin=await requireRole(['ADMIN']);if(!admin)return NextResponse.json({error:'Admin required'},{status:403});
 const {riderId,date}=await params;if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return NextResponse.json({error:'Invalid date'},{status:400});
 const entries=await db.auditLog.findMany({where:{entityType:'Rider',entityId:riderId,action:'RIDER_PLATFORM_COMMISSION_SUBMITTED'},orderBy:{createdAt:'desc'},select:{metadata:true}});
 const meta=entries.map(e=>e.metadata).find(m=>m&&typeof m==='object'&&!Array.isArray(m)&&m.date===date);
 if(!meta||typeof meta!=='object'||Array.isArray(meta)||typeof meta.proofKey!=='string'||!meta.proofKey.startsWith('platform-commission/'+riderId+'/'+date+'/'))return NextResponse.json({error:'Proof not found'},{status:404});
 const bucket=process.env.BUCKET_NAME,endpoint=process.env.BUCKET_ENDPOINT,accessKeyId=process.env.BUCKET_ACCESS_KEY_ID,secretAccessKey=process.env.BUCKET_SECRET_ACCESS_KEY;
 if(!bucket||!endpoint||!accessKeyId||!secretAccessKey)return NextResponse.json({error:'Storage unavailable'},{status:503});
 try{const s3=new S3Client({region:process.env.BUCKET_REGION||'auto',endpoint,forcePathStyle:process.env.BUCKET_FORCE_PATH_STYLE==='true',credentials:{accessKeyId,secretAccessKey}});
 const obj=await s3.send(new GetObjectCommand({Bucket:bucket,Key:meta.proofKey}));
 if(!obj.Body||!obj.ContentType||!['image/jpeg','image/png','image/webp'].includes(obj.ContentType))return NextResponse.json({error:'Invalid photo'},{status:415});
 return new NextResponse(new Uint8Array(await obj.Body.transformToByteArray()),{headers:{'Content-Type':obj.ContentType,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})
 }catch(e){console.error('Commission proof lookup',e);return NextResponse.json({error:'Proof unavailable'},{status:502})}
}
