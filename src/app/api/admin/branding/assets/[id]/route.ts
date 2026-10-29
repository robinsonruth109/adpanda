import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
import {safeBrandHref} from '@/lib/site-branding';
import {deleteBucketMedia} from '@/lib/bucket-media';
const schema=z.object({
 title:z.string().trim().max(140).nullable(),
 subtitle:z.string().trim().max(300).nullable(),
 ctaLabel:z.string().trim().max(50).nullable(),
 href:safeBrandHref.nullable(),
 sortOrder:z.number().int().min(0).max(999),
 active:z.boolean()
});
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const admin=await requireRole(['ADMIN']);if(!admin)return NextResponse.json({error:'Admin only'},{status:403});
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'Invalid banner details'},{status:400});
 const {id}=await params;
 const record=await db.brandAsset.findUnique({where:{id}});
 if(!record)return NextResponse.json({error:'Asset not found'},{status:404});
 if(record.kind==='LOGO')return NextResponse.json({error:'Replace logo using the logo uploader'},{status:400});
 const updated=await db.$transaction(async tx=>{
  const item=await tx.brandAsset.update({where:{id},data:parsed.data});
  await tx.auditLog.create({data:{actorId:admin.id,action:'BRANDING_ASSET_UPDATED',entityType:'BrandAsset',entityId:id,metadata:{kind:record.kind,active:parsed.data.active,sortOrder:parsed.data.sortOrder}}});
  return item;
 });
 return NextResponse.json({ok:true,asset:{id:updated.id,kind:updated.kind,active:updated.active,sortOrder:updated.sortOrder}});
}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const admin=await requireRole(['ADMIN']);if(!admin)return NextResponse.json({error:'Admin only'},{status:403});
 const {id}=await params;
 const asset=await db.brandAsset.findUnique({where:{id}});
 if(!asset)return NextResponse.json({error:'Asset not found'},{status:404});
 await db.$transaction(async tx=>{
  await tx.brandAsset.delete({where:{id}});
  await tx.auditLog.create({data:{actorId:admin.id,action:'BRANDING_ASSET_DELETED',entityType:'BrandAsset',entityId:id,metadata:{kind:asset.kind}}});
 });
 try{await deleteBucketMedia(asset.objectKey)}catch(e){console.error('Branding bucket orphan cleanup failed',e)}
 return NextResponse.json({ok:true});
}
