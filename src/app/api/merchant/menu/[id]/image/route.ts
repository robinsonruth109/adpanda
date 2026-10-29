import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
import {deleteBucketMedia,identifyImage,menuMediaKey,uploadBucketMedia} from '@/lib/bucket-media';

export const runtime='nodejs';
const MAX_BYTES=3*1024*1024;

async function ownedItem(id:string,userId:string){
 return db.menuItem.findFirst({
  where:{id,category:{kitchen:{merchant:{status:'APPROVED',members:{some:{userId}}}}}},
  select:{id:true,imageKey:true,imageVersion:true}
 });
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
 const user=await currentUser();if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
 const {id}=await params;
 const item=await ownedItem(id,user.id);
 if(!item)return NextResponse.json({error:'Food item not found in your approved kitchen'},{status:403});
 const requestSize=Number(request.headers.get('content-length')||0);
 if(requestSize>MAX_BYTES+20000)return NextResponse.json({error:'Maximum image size is 3 MB'},{status:413});
 let file:FormDataEntryValue|null;
 try{const data=await request.formData();file=data.get('image')}catch{return NextResponse.json({error:'Invalid image form data'},{status:400})}
 if(!(file instanceof File))return NextResponse.json({error:'Select an image file'},{status:400});
 if(!file.size||file.size>MAX_BYTES)return NextResponse.json({error:'Image must be between 1 byte and 3 MB'},{status:413});
 const declared=file.type.toLowerCase();
 if(!['image/jpeg','image/png','image/webp'].includes(declared))return NextResponse.json({error:'Only JPG, PNG or WebP images are supported'},{status:415});
 const bytes=Buffer.from(await file.arrayBuffer());
 const image=identifyImage(bytes);
 if(!image||image.mime!==declared)return NextResponse.json({error:'File content does not match a valid JPG, PNG or WebP image'},{status:415});
 const key=menuMediaKey(item.id,image.ext);
 try{
  await uploadBucketMedia(key,bytes,image.mime);
  try{
   await db.$transaction(async tx=>{
    const updated=await tx.menuItem.updateMany({
     where:{id,imageVersion:item.imageVersion,imageKey:item.imageKey},
     data:{imageKey:key,imageMimeType:image.mime,imageVersion:{increment:1}}
    });
    if(updated.count!==1)throw new Error('IMAGE_CHANGED');
    await tx.auditLog.create({data:{actorId:user.id,action:'MERCHANT_MENU_IMAGE_UPLOADED',entityType:'MenuItem',entityId:id,metadata:{format:image.mime,bytes:file.size,replaced:Boolean(item.imageKey)}}});
   });
  }catch(error){
   try{await deleteBucketMedia(key)}catch(cleanup){console.error('Could not clean up unlinked bucket image',cleanup)}
   if(error instanceof Error&&error.message==='IMAGE_CHANGED')return NextResponse.json({error:'Image changed in another session; refresh and retry'},{status:409});
   throw error;
  }
  if(item.imageKey){try{await deleteBucketMedia(item.imageKey)}catch(error){console.error('Old bucket image deletion failed',error)}}
  return NextResponse.json({ok:true,imageVersion:item.imageVersion+1,url:'/api/media/menu/'+id+'?v='+(item.imageVersion+1)});
 }catch(error){
  console.error('Merchant bucket upload failed',error);
  return NextResponse.json({error:'Could not save image to Railway bucket. Please check storage configuration and retry.'},{status:503});
 }
}

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
 const user=await currentUser();if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
 const {id}=await params;
 const item=await ownedItem(id,user.id);
 if(!item)return NextResponse.json({error:'Food item not found in your approved kitchen'},{status:403});
 if(!item.imageKey)return NextResponse.json({ok:true,imageVersion:item.imageVersion});
 try{
  await db.$transaction(async tx=>{
   const updated=await tx.menuItem.updateMany({where:{id,imageVersion:item.imageVersion,imageKey:item.imageKey},data:{imageKey:null,imageMimeType:null,imageVersion:{increment:1}}});
   if(updated.count!==1)throw new Error('IMAGE_CHANGED');
   await tx.auditLog.create({data:{actorId:user.id,action:'MERCHANT_MENU_IMAGE_REMOVED',entityType:'MenuItem',entityId:id}});
  });
  try{await deleteBucketMedia(item.imageKey)}catch(error){console.error('Deleted image reference, but bucket cleanup failed',error)}
  return NextResponse.json({ok:true,imageVersion:item.imageVersion+1});
 }catch(error){
  if(error instanceof Error&&error.message==='IMAGE_CHANGED')return NextResponse.json({error:'Image changed; refresh and retry'},{status:409});
  console.error('Merchant image deletion failed',error);
  return NextResponse.json({error:'Could not remove image'},{status:500});
 }
}
