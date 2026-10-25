import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
import {readBucketMedia} from '@/lib/bucket-media';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const item=await db.menuItem.findUnique({
  where:{id},
  select:{imageKey:true,imageMimeType:true,category:{select:{active:true,kitchen:{select:{active:true,merchant:{select:{status:true,members:{select:{userId:true}}}}}}}}}
 });
 if(!item?.imageKey||!item.imageMimeType)return new NextResponse(null,{status:404});
 const isPublic=item.category.active&&item.category.kitchen.active&&item.category.kitchen.merchant.status==='APPROVED';
 if(!isPublic){
  const user=await currentUser();
  if(!user||(user.role!=='ADMIN'&&!item.category.kitchen.merchant.members.some(m=>m.userId===user.id)))
   return new NextResponse(null,{status:404});
 }
 if(!['image/jpeg','image/png','image/webp'].includes(item.imageMimeType))return new NextResponse(null,{status:415});
 try{
  const object=await readBucketMedia(item.imageKey);
  if(!object.Body)return new NextResponse(null,{status:404});
  return new Response(object.Body.transformToWebStream() as ReadableStream<Uint8Array>,{
   status:200,
   headers:{
    'Content-Type':item.imageMimeType,
    'Content-Disposition':'inline',
    'X-Content-Type-Options':'nosniff',
    'Cache-Control':isPublic?'public, max-age=60, stale-while-revalidate=180':'private, no-store'
   }
  });
 }catch(error){
  const code=typeof error==='object'&&error!==null&&'name' in error?String(error.name):'';
  if(code==='NoSuchKey'||code==='NotFound')return new NextResponse(null,{status:404});
  console.error('Failed serving image from Railway bucket',error);
  return NextResponse.json({error:'Media temporarily unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
