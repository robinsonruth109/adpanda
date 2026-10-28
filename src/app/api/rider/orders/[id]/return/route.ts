import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
import {storeReturnPhoto} from '@/lib/return-photo';
export const runtime='nodejs';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const user=await requireRole(['RIDER']);
 if(!user)return NextResponse.json({error:'Rider login required'},{status:403});
 const {id}=await params;
 const order=await db.order.findUnique({where:{id},select:{status:true,delivery:{select:{rider:{select:{userId:true}}}},codCollection:{select:{id:true}}}});
 if(!order||order.delivery?.rider.userId!==user.id)return NextResponse.json({error:'Not assigned to this rider'},{status:403});
 if(order.status!=='FAILED'||order.codCollection)return NextResponse.json({error:'This is not a pending failed-delivery return'},{status:409});
 const body=await request.formData().catch(()=>null);
 let key:string;
 try{key=await storeReturnPhoto(body?.get('returnPhoto')||null,id,'rider')}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Invalid photo'},{status:400})}
 try{
 const result=await db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM \`Order\` WHERE id = ${id} FOR UPDATE`;
  const existing=await tx.auditLog.findMany({where:{entityType:'Order',entityId:id,action:{in:['RIDER_RETURN_SUBMITTED','MERCHANT_RETURN_RECEIVED']}},select:{action:true}});
  if(existing.length)return {error:'Return proof already submitted or closed',code:409};
  const current=await tx.order.findUnique({where:{id},select:{status:true,codCollection:{select:{id:true}}}});
  if(current?.status!=='FAILED'||current.codCollection)return {error:'Order not returnable',code:409};
  await tx.auditLog.create({data:{actorId:user.id,entityType:'Order',entityId:id,action:'RIDER_RETURN_SUBMITTED',metadata:{photoKey:key}}});
  return {ok:true,awaitingMerchantConfirmation:true};
 });
 return NextResponse.json(result,{status:'error'in result?result.code:200});
 }catch(e){console.error('Rider return submit failed',e);return NextResponse.json({error:'Could not submit parcel return'},{status:500})}
}
