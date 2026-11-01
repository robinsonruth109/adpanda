import {NextResponse} from 'next/server';
import {mobileSession} from '@/lib/mobile-session';
import {db} from '@/lib/db';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const session=await mobileSession(request);
 if(!session||session.user.role!=='CUSTOMER')return NextResponse.json({error:'Unauthorized'},{status:401});
 const {id}=await params;
 const order=await db.order.findFirst({where:{id,customerId:session.userId},select:{status:true,delivery:{select:{riderId:true,assignedAt:true}}}});
 if(!order)return NextResponse.json({error:'Order not found'},{status:404});
 if(['DELIVERED','FAILED','CANCELLED'].includes(order.status)||!order.delivery)return NextResponse.json({status:order.status,tracking:false,location:null},{headers:{'Cache-Control':'no-store'}});
 const latest=await db.riderLocation.findFirst({where:{riderId:order.delivery.riderId,recordedAt:{gte:order.delivery.assignedAt}},orderBy:{recordedAt:'desc'},select:{latitude:true,longitude:true,accuracyMeters:true,recordedAt:true}});
 const fresh=latest&&Date.now()-latest.recordedAt.getTime()<=60000;
 return NextResponse.json({status:order.status,tracking:!!fresh,location:fresh?{latitude:Number(latest.latitude),longitude:Number(latest.longitude),accuracyMeters:latest.accuracyMeters,recordedAt:latest.recordedAt.toISOString()}:null},{headers:{'Cache-Control':'no-store'}});
}
