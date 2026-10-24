import {NextResponse} from 'next/server';
import {Prisma} from '@prisma/client';
import {z} from 'zod';
import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
import {unallocatedCashLiquidity} from '@/lib/merchant-earnings';
const schema=z.object({
 action:z.enum(['APPROVE','REJECT','PAID']),
 note:z.string().trim().max(500).optional(),
 reference:z.string().trim().min(4).max(100).optional(),
 transferConfirmed:z.boolean().optional()
});
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const admin=await requireRole(['ADMIN']);if(!admin)return NextResponse.json({error:'Admin only'},{status:403});
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Invalid settlement action'},{status:400});
 const {id}=await params;
 const {action,note,reference,transferConfirmed}=parsed.data;
 if(action==='REJECT'&&(!note||note.length<5))return NextResponse.json({error:'Rejection reason must have at least 5 characters'},{status:400});
 if(action==='PAID'&&(!reference||!transferConfirmed))return NextResponse.json({error:'A unique transfer reference and confirmation of actual payment are required'},{status:400});
 try{
  const result=await db.$transaction(async tx=>{
   const settlement=await tx.merchantSettlement.findUnique({where:{id},select:{id:true,merchantId:true,status:true,amount:true,reference:true,payoutAccount:true}});
   if(!settlement)return {error:'Settlement not found',statusCode:404};
   const valid=(action==='APPROVE'&&settlement.status==='PENDING')||(action==='REJECT'&&['PENDING','APPROVED'].includes(settlement.status))||(action==='PAID'&&settlement.status==='APPROVED');
   if(!valid)return {error:'Settlement cannot transition from '+settlement.status+' using '+action,statusCode:409};
   if(action==='PAID'){
    if(!settlement.payoutAccount)return {error:'Payout account missing; do not mark paid',statusCode:409};
    const previous=await tx.merchantSettlement.findUnique({where:{reference},select:{id:true}});
    if(previous)return {error:'Transfer reference already used',statusCode:409};
    const liquidity=await unallocatedCashLiquidity(tx);
    if(liquidity.lt(settlement.amount))return {error:'Recorded Admin cash deposits are insufficient for this payout after earlier paid settlements',statusCode:409};
   }
   const updated=await tx.merchantSettlement.updateMany({where:{id,status:settlement.status},data:{
    status:action==='APPROVE'?'APPROVED':action==='PAID'?'PAID':'REJECTED',
    reviewedById:admin.id,reviewedAt:new Date(),reviewNote:note||null,
    ...(action==='PAID'?{reference,paidAt:new Date()}:{})
   }});
   if(updated.count!==1)return {error:'Settlement was changed concurrently',statusCode:409};
   await tx.auditLog.create({data:{actorId:admin.id,action:'ADMIN_PAYOUT_'+action,entityType:'MerchantSettlement',entityId:id,metadata:{merchantId:settlement.merchantId,amount:settlement.amount.toFixed(2),fromStatus:settlement.status,toStatus:action==='APPROVE'?'APPROVED':action==='PAID'?'PAID':'REJECTED',reference:action==='PAID'?reference:null,note:note||null}}});
   return {ok:true,status:action==='APPROVE'?'APPROVED':action==='PAID'?'PAID':'REJECTED'};
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:10000,timeout:15000});
  if('error' in result)return NextResponse.json({error:result.error},{status:result.statusCode});
  return NextResponse.json(result);
 }catch(error){
  if(error instanceof Prisma.PrismaClientKnownRequestError){
   if(error.code==='P2002')return NextResponse.json({error:'Transfer reference already used'},{status:409});
   if(error.code==='P2034')return NextResponse.json({error:'Concurrent payout detected; refresh and retry'},{status:409});
  }
  console.error('Admin settlement status error',error);
  return NextResponse.json({error:'Could not update settlement; check records before retrying'},{status:500});
 }
}
