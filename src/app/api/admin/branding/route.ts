import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
import {brandSchema,BRAND_KEY} from '@/lib/site-branding';
export async function PATCH(request:Request){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
 const admin=await requireRole(['ADMIN']);
 if(!admin)return NextResponse.json({error:'Admin access required'},{status:403});
 const parsed=brandSchema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||'Invalid branding content'},{status:400});
 await db.$transaction(async tx=>{
  await tx.platformSetting.upsert({
   where:{key:BRAND_KEY},
   create:{key:BRAND_KEY,value:JSON.stringify(parsed.data)},
   update:{value:JSON.stringify(parsed.data)}
  });
  await tx.auditLog.create({data:{actorId:admin.id,action:'BRANDING_CONTENT_UPDATED',entityType:'PlatformSetting',entityId:BRAND_KEY,metadata:{changed:Object.keys(parsed.data)}}});
 });
 return NextResponse.json({ok:true});
}
