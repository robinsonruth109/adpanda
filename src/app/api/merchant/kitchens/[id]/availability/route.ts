import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
const schema=z.object({acceptingOrders:z.boolean()});
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
 const user=await currentUser();if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
 const input=schema.safeParse(await request.json().catch(()=>null));
 if(!input.success)return NextResponse.json({error:'Invalid kitchen availability'},{status:400});
 const {id}=await params;
 const kitchen=await db.kitchen.findFirst({where:{id,active:true,merchant:{status:'APPROVED',members:{some:{userId:user.id}}}}});
 if(!kitchen)return NextResponse.json({error:'Not an approved kitchen you manage'},{status:403});
 await db.$transaction(async tx=>{
  await tx.kitchen.update({where:{id},data:{acceptingOrders:input.data.acceptingOrders}});
  await tx.auditLog.create({data:{actorId:user.id,action:'KITCHEN_AVAILABILITY',entityType:'Kitchen',entityId:id,metadata:{acceptingOrders:input.data.acceptingOrders}}});
 });
 return NextResponse.json({ok:true,acceptingOrders:input.data.acceptingOrders});
}
