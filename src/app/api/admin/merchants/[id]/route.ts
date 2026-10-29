import {isTrustedMutation} from '@/lib/request-security';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';

const payload=z.object({
 action:z.enum(['APPROVE','REJECT','SUSPEND','SAVE_COMMISSION']),
 kitchenId:z.string().min(1).max(191).optional(),
 commissionRate:z.number().finite().min(0).max(100)
}).strict();

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
 const actor=await requireRole(['ADMIN']);
 if(!actor)return NextResponse.json({error:'Forbidden'},{status:403});
 const parsed=payload.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Valid action and commission rate required (0–100%)'},{status:400});
 const {id}=await params;
 const {action,commissionRate,kitchenId}=parsed.data;
 try{
  const result=await db.$transaction(async tx=>{
   const current=await tx.merchant.findUnique({where:{id}});
   if(!current) return {error:'Merchant not found',code:404};
   if(action==='APPROVE'&&current.status==='APPROVED')
    return {error:'Already approved. Use Save commission to edit the rate.',code:409};
   if(action==='REJECT'&&current.status==='APPROVED')
    return {error:'Approved merchants cannot be rejected. Use Suspend instead.',code:409};
   if(action==='SAVE_COMMISSION'&&current.status!=='APPROVED')
    return {error:'Approve the merchant before editing commission only.',code:409};

   // Never reset opening hours, active state, approvedAt or order acceptance
   // when simply saving a commission on an already-approved shop.
   if(action==='SAVE_COMMISSION'){
    if(!kitchenId)return {error:'Select a store before saving its commission.',code:400};
    const updated=await tx.kitchen.updateMany({where:{id:kitchenId,merchantId:id},data:{commissionRate}});
    if(updated.count!==1)return {error:'Store not found for merchant',code:404};
   }else{
    const status=action==='APPROVE'?'APPROVED':action==='REJECT'?'REJECTED':'SUSPENDED';
    const transitioned=await tx.merchant.updateMany({where:{id,status:current.status},data:{status}});
    if(transitioned.count!==1)return {error:'Merchant changed; refresh and try again.',code:409};
    if(action==='APPROVE'){
     await tx.kitchen.updateMany({where:{merchantId:id},data:{commissionRate,active:true,approvedAt:new Date(),acceptingOrders:false}});
    }else{
     await tx.kitchen.updateMany({where:{merchantId:id},data:{commissionRate,active:false,acceptingOrders:false}});
    }
   }
   await tx.auditLog.create({data:{
    actorId:actor.id,
    action:action==='SAVE_COMMISSION'?'MERCHANT_COMMISSION_CHANGED':'MERCHANT_REVIEW',
    entityType:'Merchant',entityId:id,
    metadata:{action,kitchenId:action==='SAVE_COMMISSION'?kitchenId:null,previousStatus:current.status,
     status:action==='SAVE_COMMISSION'?current.status:action==='APPROVE'?'APPROVED':action==='REJECT'?'REJECTED':'SUSPENDED',
     commissionRate}
   }});
   return {ok:true,status:action==='SAVE_COMMISSION'?current.status:action==='APPROVE'?'APPROVED':action==='REJECT'?'REJECTED':'SUSPENDED'};
  });
  if('error'in result)return NextResponse.json({error:result.error},{status:result.code});
  return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  console.error('Admin merchant update failed',error);
  return NextResponse.json({error:'Unable to update merchant. Try again.'},{status:500});
 }
}
