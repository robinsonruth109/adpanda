import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
import {readBucketMedia} from '@/lib/bucket-media';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const asset=await db.brandAsset.findUnique({where:{id},select:{objectKey:true,mimeType:true,active:true}});
 if(!asset)return new NextResponse(null,{status:404});
 if(!asset.active){
  const admin=await requireRole(['ADMIN']);if(!admin)return new NextResponse(null,{status:404});
 }
 if(!['image/jpeg','image/png','image/webp'].includes(asset.mimeType))return new NextResponse(null,{status:415});
 try{
  const item=await readBucketMedia(asset.objectKey);
  if(!item.Body)return new NextResponse(null,{status:404});
  return new Response(item.Body.transformToWebStream() as ReadableStream<Uint8Array>,{headers:{
   'Content-Type':asset.mimeType,
   'Content-Disposition':'inline',
   'X-Content-Type-Options':'nosniff',
   'Cache-Control':asset.active?'public, max-age=60, stale-while-revalidate=180':'private, no-store'
  }});
 }catch(error){
  const name=error&&typeof error==='object'&&'name' in error?String(error.name):'';
  if(name==='NoSuchKey'||name==='NotFound')return new NextResponse(null,{status:404});
  console.error('Brand media read failed',error);
  return NextResponse.json({error:'Media unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
