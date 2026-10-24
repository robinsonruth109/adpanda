import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const user=await currentUser();if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
 const {id}=await params;
 const order=await db.order.findUnique({where:{id},select:{id:true,customerId:true,status:true,delivery:{select:{riderId:true,assignedAt:true,rider:{select:{userId:true}}}}}});
 if(!order)return NextResponse.json({error:'Not found'},{status:404});
 if(user.role!=='ADMIN'&&order.customerId!==user.id&&order.delivery?.rider.userId!==user.id)return NextResponse.json({error:'Forbidden'},{status:403});
 const finished=['DELIVERED','CANCELLED','FAILED'].includes(order.status);
 if(finished||!order.delivery)return NextResponse.json({orderStatus:order.status,tracking:false,location:null},{headers:{'Cache-Control':'no-store'}});
 const point=await db.riderLocation.findFirst({where:{riderId:order.delivery.riderId,recordedAt:{gte:order.delivery.assignedAt}},orderBy:{recordedAt:'desc'},select:{latitude:true,longitude:true,accuracyMeters:true,recordedAt:true}});
 const age=point?Date.now()-point.recordedAt.getTime():Infinity;
 // Rider location is disclosed only while fresh and only to the order's authorized users.
 return NextResponse.json({orderStatus:order.status,tracking:true,location:point&&age<=60000?{latitude:Number(point.latitude),longitude:Number(point.longitude),accuracyMeters:point.accuracyMeters,recordedAt:point.recordedAt.toISOString(),ageSeconds:Math.round(age/1000)}:null,lastSeenSeconds:point?Math.round(age/1000):null},{headers:{'Cache-Control':'no-store'}});
}
