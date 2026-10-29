import {NextResponse} from 'next/server';
import {GetObjectCommand,S3Client} from '@aws-sdk/client-s3';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
export const runtime='nodejs';
const allowed=['parcel','rider-handover','customer-handover','payment','return-rider','return-merchant'] as const;
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const user=await currentUser();if(!user)return NextResponse.json({error:'Authentication required'},{status:401});
 const {id}=await params;
 const order=await db.order.findUnique({where:{id},select:{delivery:{select:{rider:{select:{userId:true}}}},kitchen:{select:{merchant:{select:{members:{where:{userId:user.id},select:{userId:true}}}}}}}});
 if(!order)return NextResponse.json({error:'Not found'},{status:404});
 const privileged=user.role==='ADMIN'||order.delivery?.rider.userId===user.id||order.kitchen.merchant.members.length>0;
 if(!privileged)return NextResponse.json({error:'Forbidden'},{status:403});
 const type=new URL(request.url).searchParams.get('type');
 if(!allowed.includes(type as typeof allowed[number]))return NextResponse.json({error:'Invalid evidence type'},{status:400});
 const actions=type==='return-rider'?['RIDER_RETURN_SUBMITTED']:type==='return-merchant'?['MERCHANT_RETURN_RECEIVED']:type==='payment'?['RIDER_SETTLEMENT_SUBMITTED']:type==='customer-handover'?['RIDER_CUSTOMER_HANDOVER']:['MERCHANT_DISPATCH_PROOF'];
 const proof=await db.auditLog.findFirst({where:{entityType:'Order',entityId:id,action:{in:actions}},orderBy:{createdAt:'desc'},select:{metadata:true}});
 const meta=proof?.metadata;
 if(!meta||typeof meta!=='object'||Array.isArray(meta))return NextResponse.json({error:'No evidence uploaded'},{status:404});
 const field=type==='return-rider'||type==='return-merchant'?'photoKey':type==='payment'?'proofKey':type==='customer-handover'?'photoKey':type==='parcel'?'parcelKey':'handoverKey';
 const key=meta[field];const prefix=type==='payment'?'settlement-proof/':'delivery-proof/';
 if(typeof key!=='string'||!key.startsWith(prefix+id+'/'))return NextResponse.json({error:'Invalid evidence reference'},{status:404});
 const bucket=process.env.BUCKET_NAME,endpoint=process.env.BUCKET_ENDPOINT,accessKeyId=process.env.BUCKET_ACCESS_KEY_ID,secretAccessKey=process.env.BUCKET_SECRET_ACCESS_KEY;
 if(!bucket||!endpoint||!accessKeyId||!secretAccessKey)return NextResponse.json({error:'Storage not configured'},{status:503});
 try{
  const client=new S3Client({region:process.env.BUCKET_REGION||'auto',endpoint,forcePathStyle:process.env.BUCKET_FORCE_PATH_STYLE==='true',credentials:{accessKeyId,secretAccessKey}});
  const object=await client.send(new GetObjectCommand({Bucket:bucket,Key:key}));
  if(!object.Body||!object.ContentType||!['image/png','image/jpeg','image/webp'].includes(object.ContentType))return NextResponse.json({error:'Unsupported image'},{status:415});
  const bytes=await object.Body.transformToByteArray();
  return new NextResponse(new Uint8Array(bytes),{headers:{'Content-Type':object.ContentType,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline; filename="order-evidence"'}});
 }catch(error){console.error('Private order evidence unavailable',error);return NextResponse.json({error:'Evidence could not be loaded'},{status:502})}
}
