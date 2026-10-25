import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
import {hoursSchema,kitchenAvailability} from '@/lib/kitchen-hours';
const payload=z.object({hours:hoursSchema,enableAuto:z.boolean().default(true)});
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
 const user=await currentUser();if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
 const parsed=payload.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||'Invalid weekly opening hours'},{status:400});
 const {id}=await params;
 const kitchen=await db.kitchen.findFirst({where:{id,active:true,merchant:{status:'APPROVED',members:{some:{userId:user.id}}}},select:{id:true}});
 if(!kitchen)return NextResponse.json({error:'You cannot manage this kitchen'},{status:403});
 const saved=await db.$transaction(async tx=>{
  const updated=await tx.kitchen.update({where:{id},data:{weeklyHours:parsed.data.hours,availabilityMode:parsed.data.enableAuto?'AUTO':'MANUAL'}});
  await tx.auditLog.create({data:{actorId:user.id,action:'KITCHEN_BUSINESS_HOURS_UPDATED',entityType:'Kitchen',entityId:id,metadata:{hours:parsed.data.hours,enableAuto:parsed.data.enableAuto}}});
  return updated;
 });
 const status=kitchenAvailability({...saved,merchant:{status:'APPROVED'}});
 return NextResponse.json({ok:true,open:status.open,mode:status.mode,reason:status.reason});
}
