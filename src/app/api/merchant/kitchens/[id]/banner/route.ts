import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
import {deleteBucketMedia,identifyImage,kitchenBannerMediaKey,uploadBucketMedia} from '@/lib/bucket-media';
export const runtime='nodejs';
const MAX=5*1024*1024;
async function kitchenOwned(id:string,userId:string){
 return db.kitchen.findFirst({where:{id,merchant:{status:'APPROVED',members:{some:{userId,role:'OWNER'}}}},select:{id:true,bannerKey:true,bannerVersion:true}});
}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const user=await currentUser();if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
 const {id}=await params;
 const kitchen=await kitchenOwned(id,user.id);if(!kitchen)return NextResponse.json({error:'Not an approved kitchen owner'},{status:403});
 const size=Number(request.headers.get('content-length')||0);
 if(size>MAX+20000)return NextResponse.json({error:'Banner limit is 5 MB'},{status:413});
 let file:FormDataEntryValue|null;
 try{file=(await request.formData()).get('banner')}catch{return NextResponse.json({error:'Invalid multipart upload'},{status:400})}
 if(!(file instanceof File)||file.size<16||file.size>MAX)return NextResponse.json({error:'Choose a banner under 5 MB'},{status:400});
 if(!['image/jpeg','image/png','image/webp'].includes(file.type.toLowerCase()))return NextResponse.json({error:'Only JPG, PNG or WebP banners are supported'},{status:415});
 const body=Buffer.from(await file.arrayBuffer());
 const image=identifyImage(body);
 if(!image||image.mime!==file.type.toLowerCase())return NextResponse.json({error:'Invalid banner file type'},{status:415});
 const key=kitchenBannerMediaKey(id,image.ext);
 try{
  await uploadBucketMedia(key,body,image.mime);
  try{
   await db.$transaction(async tx=>{
    const updated=await tx.kitchen.updateMany({where:{id,bannerVersion:kitchen.bannerVersion,bannerKey:kitchen.bannerKey},data:{bannerKey:key,bannerMimeType:image.mime,bannerVersion:{increment:1}}});
    if(updated.count!==1)throw Error('CHANGED');
    await tx.auditLog.create({data:{actorId:user.id,action:'KITCHEN_BANNER_UPLOADED',entityType:'Kitchen',entityId:id,metadata:{bytes:file.size,mime:image.mime,replaced:Boolean(kitchen.bannerKey)}}});
   });
  }catch(error){try{await deleteBucketMedia(key)}catch(cleanup){console.error('Unlinked banner cleanup failed',cleanup)}throw error}
  if(kitchen.bannerKey){try{await deleteBucketMedia(kitchen.bannerKey)}catch(err){console.error('Old banner cleanup failed',err)}}
  return NextResponse.json({ok:true,bannerVersion:kitchen.bannerVersion+1,url:'/api/media/kitchens/'+id+'/banner?v='+(kitchen.bannerVersion+1)});
 }catch(error){
  if(error instanceof Error&&error.message==='CHANGED')return NextResponse.json({error:'Banner changed in another session; refresh'},{status:409});
  console.error('Bucket banner upload failed',error);
  return NextResponse.json({error:'Banner upload failed. Verify bucket access and retry.'},{status:503});
 }
}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const user=await currentUser();if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
 const {id}=await params;const kitchen=await kitchenOwned(id,user.id);if(!kitchen)return NextResponse.json({error:'Not authorized'},{status:403});
 if(!kitchen.bannerKey)return NextResponse.json({ok:true,bannerVersion:kitchen.bannerVersion});
 try{
  await db.$transaction(async tx=>{
   const updated=await tx.kitchen.updateMany({where:{id,bannerVersion:kitchen.bannerVersion,bannerKey:kitchen.bannerKey},data:{bannerKey:null,bannerMimeType:null,bannerVersion:{increment:1}}});
   if(updated.count!==1)throw Error('CHANGED');
   await tx.auditLog.create({data:{actorId:user.id,action:'KITCHEN_BANNER_REMOVED',entityType:'Kitchen',entityId:id}});
  });
  try{await deleteBucketMedia(kitchen.bannerKey)}catch(err){console.error('Banner cleanup failed',err)}
  return NextResponse.json({ok:true,bannerVersion:kitchen.bannerVersion+1});
 }catch(error){
  if(error instanceof Error&&error.message==='CHANGED')return NextResponse.json({error:'Banner changed; refresh and retry'},{status:409});
  return NextResponse.json({error:'Could not remove banner'},{status:500});
 }
}
