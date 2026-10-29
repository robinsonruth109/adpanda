import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
const schema=z.object({description:z.string().trim().max(2000)});
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const user=await currentUser();if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
 const {id}=await params;
 const input=schema.safeParse(await request.json().catch(()=>null));
 if(!input.success)return NextResponse.json({error:'Description must be under 2000 characters'},{status:400});
 const kitchen=await db.kitchen.findFirst({where:{id,merchant:{status:'APPROVED',members:{some:{userId:user.id,role:'OWNER'}}}},select:{id:true}});
 if(!kitchen)return NextResponse.json({error:'Only an approved kitchen owner can update this profile'},{status:403});
 await db.$transaction(async tx=>{
  await tx.kitchen.update({where:{id},data:{description:input.data.description}});
  await tx.auditLog.create({data:{actorId:user.id,action:'MERCHANT_KITCHEN_PROFILE_UPDATE',entityType:'Kitchen',entityId:id,metadata:{changed:['description']}}});
 });
 return NextResponse.json({ok:true});
}
