import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
import {readBucketMedia} from '@/lib/bucket-media';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const kitchen=await db.kitchen.findUnique({where:{id},select:{active:true,bannerKey:true,bannerMimeType:true,merchant:{select:{status:true,members:{select:{userId:true}}}}}});
 if(!kitchen?.bannerKey||!kitchen.bannerMimeType)return new NextResponse(null,{status:404});
 const publicAccess=kitchen.active&&kitchen.merchant.status==='APPROVED';
 if(!publicAccess){
  const user=await currentUser();
  if(!user||user.role!=='ADMIN'&&!kitchen.merchant.members.some(m=>m.userId===user.id))return new NextResponse(null,{status:404});
 }
 if(!['image/jpeg','image/png','image/webp'].includes(kitchen.bannerMimeType))return new NextResponse(null,{status:415});
 try{
  const object=await readBucketMedia(kitchen.bannerKey);
  if(!object.Body)return new NextResponse(null,{status:404});
  return new Response(object.Body.transformToWebStream() as ReadableStream<Uint8Array>,{
   headers:{'Content-Type':kitchen.bannerMimeType,'Content-Disposition':'inline','X-Content-Type-Options':'nosniff','Cache-Control':publicAccess?'public, max-age=60, stale-while-revalidate=180':'private, no-store'}
  });
 }catch(err){
  const name=err&&typeof err==='object'&&'name' in err?String(err.name):'';
  if(['NoSuchKey','NotFound'].includes(name))return new NextResponse(null,{status:404});
  console.error('Bucket kitchen banner read failed',err);
  return NextResponse.json({error:'Banner temporarily unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
