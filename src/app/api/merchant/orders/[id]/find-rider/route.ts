import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';

/**
 * Merchant requests manual Admin dispatch BEFORE accepting a new order.
 * This is a request only, not a promise that an online rider is available.
 */
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
 const user=await currentUser();
 if(!user)return NextResponse.json({error:'Please sign in'},{status:401});
 const {id}=await params;
 try{
  const result=await db.$transaction(async tx=>{
   const order=await tx.order.findUnique({where:{id},select:{
    id:true,status:true,dispatchRequestedAt:true,delivery:{select:{riderId:true}},
    kitchen:{select:{merchant:{select:{status:true,members:{where:{userId:user.id},select:{userId:true}}}}}}
   }});
   if(!order||order.kitchen.merchant.status!=='APPROVED'||!order.kitchen.merchant.members.length)
    return {error:'Order not found or unauthorized',code:403};
   if(order.status!=='PLACED')return {error:'Only newly placed orders can request a rider',code:409};
   if(order.delivery)return {ok:true,requested:true,assigned:true};
   if(order.dispatchRequestedAt)return {ok:true,requested:true,assigned:false};
   const updated=await tx.order.updateMany({
    where:{id,status:'PLACED',dispatchRequestedAt:null},
    data:{dispatchRequestedAt:new Date()}
   });
   if(updated.count!==1)return {error:'Order updated elsewhere. Refresh.',code:409};
   await tx.auditLog.create({data:{actorId:user.id,action:'MERCHANT_RIDER_SEARCH_REQUESTED',
    entityType:'Order',entityId:id,metadata:{from:'PLACED',requestType:'PRE_ACCEPT_RIDER_SEARCH'}}});
   return {ok:true,requested:true,assigned:false};
  });
  if('error'in result)return NextResponse.json({error:result.error},{status:result.code});
  return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(err){console.error('Merchant rider request failed',err);return NextResponse.json({error:'Could not request rider. Retry.'},{status:500})}
}
