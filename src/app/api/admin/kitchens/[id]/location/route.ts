import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';

const schema=z.object({latitude:z.number().finite().min(-85).max(85),longitude:z.number().finite().min(-180).max(180)});
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const admin=await requireRole(['ADMIN']);
 if(!admin)return NextResponse.json({error:'Forbidden'},{status:403});
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Invalid coordinates'},{status:400});
 const {id}=await params;
 const prior=await db.kitchen.findUnique({where:{id},select:{latitude:true,longitude:true,merchant:{select:{status:true}}}});
 if(!prior)return NextResponse.json({error:'Kitchen not found'},{status:404});
 if(prior.merchant.status==='APPROVED')return NextResponse.json({error:'Approved kitchen location changes require a separate controlled relocation workflow'},{status:409});
 await db.$transaction(async tx=>{
  await tx.kitchen.update({where:{id},data:parsed.data});
  await tx.auditLog.create({data:{actorId:admin.id,action:'KITCHEN_LOCATION_CORRECTION',entityType:'Kitchen',entityId:id,metadata:{oldLatitude:String(prior.latitude),oldLongitude:String(prior.longitude),newLatitude:parsed.data.latitude,newLongitude:parsed.data.longitude}}});
 });
 return NextResponse.json({ok:true});
}
