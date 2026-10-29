import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
import {identifyImage,uploadBucketMedia,deleteBucketMedia,brandingMediaKey} from '@/lib/bucket-media';
import {safeBrandHref} from '@/lib/site-branding';
export const runtime='nodejs';
const MAX_IMAGE=5*1024*1024;
const allowed=['LOGO','HERO','PROMO'] as const;
export async function POST(request:Request){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
 const admin=await requireRole(['ADMIN']);if(!admin)return NextResponse.json({error:'Admin only'},{status:403});
 if(Number(request.headers.get('content-length')||0)>MAX_IMAGE+30000)return NextResponse.json({error:'Image limit is 5 MB'},{status:413});
 let form:FormData;
 try{form=await request.formData()}catch{return NextResponse.json({error:'Invalid upload form'},{status:400})}
 const kind=String(form.get('kind')||'');
 const file=form.get('image');
 if(!allowed.some(k=>k===kind))return NextResponse.json({error:'Choose logo, hero or promotional banner'},{status:400});
 if(!(file instanceof File)||file.size<16||file.size>MAX_IMAGE)return NextResponse.json({error:'Please choose an image under 5 MB'},{status:413});
 const title=String(form.get('title')||'').trim().slice(0,140);
 const subtitle=String(form.get('subtitle')||'').trim().slice(0,300);
 const ctaLabel=String(form.get('ctaLabel')||'').trim().slice(0,50);
 const href=String(form.get('href')||'/kitchens').trim();
 if(!safeBrandHref.safeParse(href).success)return NextResponse.json({error:'Banner links must point to an internal page starting with /'},{status:400});
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))return NextResponse.json({error:'Only JPG, PNG and WebP images supported'},{status:415});
 const buffer=Buffer.from(await file.arrayBuffer());
 const valid=identifyImage(buffer);
 if(!valid||valid.mime!==file.type)return NextResponse.json({error:'Image content/type mismatch'},{status:415});
 const kindCount=await db.brandAsset.count({where:{kind}});
 if(kind!=='LOGO'&&kindCount>=(kind==='HERO'?6:18))return NextResponse.json({error:'Banner limit reached. Remove another banner first.'},{status:409});
 const key=brandingMediaKey(kind,valid.ext);
 try{
  await uploadBucketMedia(key,buffer,valid.mime);
  let replaced:string[]=[];
  let asset;
  try{
   asset=await db.$transaction(async tx=>{
    if(kind==='LOGO'){
     const old=await tx.brandAsset.findMany({where:{kind:'LOGO'},select:{objectKey:true}});
     replaced=old.map(x=>x.objectKey);
     await tx.brandAsset.deleteMany({where:{kind:'LOGO'}});
    }
    const created=await tx.brandAsset.create({data:{
     kind,objectKey:key,mimeType:valid.mime,
     title:kind==='LOGO'?null:title||null,subtitle:kind==='LOGO'?null:subtitle||null,
     ctaLabel:kind==='LOGO'?null:ctaLabel||null,href:kind==='LOGO'?null:href,
     sortOrder:kindCount,active:true
    }});
    await tx.auditLog.create({data:{actorId:admin.id,action:'BRANDING_ASSET_UPLOADED',entityType:'BrandAsset',entityId:created.id,metadata:{kind,bytes:file.size}}});
    return created;
   });
  }catch(e){try{await deleteBucketMedia(key)}catch{}throw e}
  for(const old of replaced){try{await deleteBucketMedia(old)}catch(err){console.error('Old logo cleanup pending',err)}}
  return NextResponse.json({ok:true,asset:{id:asset.id,kind:asset.kind,title:asset.title,subtitle:asset.subtitle,ctaLabel:asset.ctaLabel,href:asset.href,active:asset.active,sortOrder:asset.sortOrder}},{status:201});
 }catch(error){
  console.error('Branding image upload error',error);
  return NextResponse.json({error:'Image could not be uploaded to Railway bucket'},{status:503});
 }
}
