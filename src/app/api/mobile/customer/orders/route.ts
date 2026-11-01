import {NextResponse} from 'next/server';
import {mobileSession} from '@/lib/mobile-session';
import {db} from '@/lib/db';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const session=await mobileSession(request);
 if(!session||session.user.role!=='CUSTOMER')return NextResponse.json({error:'Unauthorized'},{status:401});
 const orders=await db.order.findMany({where:{customerId:session.userId},orderBy:{placedAt:'desc'},take:100,select:{
  id:true,code:true,status:true,placedAt:true,codTotal:true,deliveryFee:true,
  kitchen:{select:{id:true,name:true,address:true,latitude:true,longitude:true,merchant:{select:{members:{where:{role:'OWNER'},take:1,select:{user:{select:{phone:true}}}}}}}},
  address:{select:{label:true,details:true,landmark:true,latitude:true,longitude:true}},
  items:{select:{id:true,itemName:true,quantity:true,lineTotal:true}},
  events:{orderBy:{createdAt:'asc'},select:{toStatus:true,createdAt:true}},
  delivery:{select:{assignedAt:true,rider:{select:{user:{select:{name:true,phone:true}}}}}}
 }});
 return NextResponse.json({orders:orders.map(o=>({...o,codTotal:Number(o.codTotal),deliveryFee:Number(o.deliveryFee),kitchen:{id:o.kitchen.id,name:o.kitchen.name,address:o.kitchen.address,latitude:Number(o.kitchen.latitude),longitude:Number(o.kitchen.longitude),phone:o.kitchen.merchant.members[0]?.user.phone??null},address:{...o.address,latitude:Number(o.address.latitude),longitude:Number(o.address.longitude)},items:o.items.map(i=>({...i,lineTotal:Number(i.lineTotal)}))}))},{headers:{'Cache-Control':'private, no-store'}});
}
