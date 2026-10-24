import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
const payload=z.object({phone:z.string().regex(/^01[3-9]\d{8}$/)});
export async function POST(request:Request){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
 const admin=await requireRole(['ADMIN']);if(!admin)return NextResponse.json({error:'Forbidden'},{status:403});
 const parsed=payload.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:'Enter an existing Bangladeshi 11-digit account phone'},{status:400});
 const phone=parsed.data.phone;
 try{
  const result=await db.$transaction(async tx=>{
   const user=await tx.user.findUnique({where:{phone},include:{rider:true,merchantMemberships:true}});
   if(!user)return {error:'Account not found. Rider must register an account first.',status:404};
   if(user.role!=='CUSTOMER'||user.rider||user.merchantMemberships.length>0)return {error:'Account is not eligible for rider onboarding',status:409};
   const changed=await tx.user.updateMany({where:{id:user.id,role:'CUSTOMER'},data:{role:'RIDER'}});
   if(changed.count!==1)return {error:'Account changed; please retry',status:409};
   const rider=await tx.rider.create({data:{userId:user.id,status:'OFFLINE',approved:false}});
   await tx.auditLog.create({data:{actorId:admin.id,action:'ADMIN_RIDER_ONBOARD',entityType:'Rider',entityId:rider.id,metadata:{userId:user.id}}});
   return {ok:true,riderId:rider.id};
  });
  if('error' in result)return NextResponse.json({error:result.error},{status:result.status});
  return NextResponse.json(result,{status:201});
 }catch(error){console.error('Rider onboarding error',error);return NextResponse.json({error:'Could not register rider'},{status:500})}
}
