import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';

const schema=z.object({approved:z.boolean().optional(),status:z.enum(['ONLINE','OFFLINE','SUSPENDED']).optional()}).refine(x=>x.approved!==undefined||x.status!==undefined);
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
 const admin=await requireRole(['ADMIN']);if(!admin)return NextResponse.json({error:'Forbidden'},{status:403});
 const input=schema.safeParse(await request.json().catch(()=>null));if(!input.success)return NextResponse.json({error:'Invalid rider action'},{status:400});
 const {id}=await params;
 try{
  const result=await db.$transaction(async tx=>{
   const rider=await tx.rider.findUnique({where:{id}});
   if(!rider)return {error:'Rider not found',status:404};
   if(rider.status==='BUSY')return {error:'Rider is assigned to an active delivery',status:409};
   const approved=input.data.approved??rider.approved;
   let status=input.data.status??rider.status;
   if(!approved&&status==='ONLINE')status='OFFLINE';
   if(status==='ONLINE'&&!approved)return {error:'Approve the rider before setting online',status:409};
   const changed=await tx.rider.updateMany({where:{id,status:rider.status,approved:rider.approved},data:{approved,status}});
   if(changed.count!==1)return {error:'Rider changed; refresh and retry',status:409};
   await tx.auditLog.create({data:{actorId:admin.id,action:'ADMIN_RIDER_UPDATE',entityType:'Rider',entityId:id,metadata:{fromStatus:rider.status,toStatus:status,fromApproved:rider.approved,toApproved:approved}}});
   return {ok:true,status,approved};
  });
  if('error' in result)return NextResponse.json({error:result.error},{status:result.status});
  return NextResponse.json(result);
 }catch(error){console.error('Rider update error',error);return NextResponse.json({error:'Could not update rider'},{status:500})}
}
