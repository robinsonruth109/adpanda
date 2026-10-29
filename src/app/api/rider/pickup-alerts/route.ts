import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
export async function GET(){
 const user=await requireRole(['RIDER']);if(!user)return NextResponse.json({error:'Rider login required'},{status:403});
 const rider=await db.rider.findUnique({where:{userId:user.id},select:{id:true}});
 if(!rider)return NextResponse.json({alerts:[]});
 const deliveries=await db.deliveryAssignment.findMany({where:{riderId:rider.id,deliveredAt:null},select:{orderId:true}});
 const ids=deliveries.map(d=>d.orderId);if(!ids.length)return NextResponse.json({alerts:[]});
 const alerts=await db.auditLog.findMany({where:{entityType:'Order',entityId:{in:ids},action:'MERCHANT_PICKUP_REQUESTED'},select:{id:true,entityId:true,createdAt:true},orderBy:{createdAt:'desc'},take:15});
 return NextResponse.json({alerts},{headers:{'Cache-Control':'no-store'}});
}
