import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const user=await currentUser();if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
 const {id}=await params;
 const order=await db.order.findUnique({where:{id},select:{status:true,code:true,delivery:{select:{riderId:true}},kitchen:{select:{merchant:{select:{members:{where:{userId:user.id},select:{userId:true}}}}}}}});
 if(!order?.delivery||!order.kitchen.merchant.members.length)return NextResponse.json({error:'Order or rider unavailable'},{status:403});
 if(!['MERCHANT_ACCEPTED','PREPARING','RIDER_ASSIGNED'].includes(order.status))return NextResponse.json({error:'Order must be accepted and under preparation'},{status:409});
 const previous=await db.auditLog.findFirst({where:{entityType:'Order',entityId:id,action:'MERCHANT_PICKUP_REQUESTED'},orderBy:{createdAt:'desc'},select:{createdAt:true}});
 if(previous&&Date.now()-previous.createdAt.getTime()<120000)return NextResponse.json({ok:true,alreadyRequested:true});
 await db.auditLog.create({data:{actorId:user.id,action:'MERCHANT_PICKUP_REQUESTED',entityType:'Order',entityId:id,metadata:{riderId:order.delivery.riderId,orderCode:order.code}}});
 return NextResponse.json({ok:true,message:'Pickup request sent to assigned rider'},{headers:{'Cache-Control':'no-store'}});
}
