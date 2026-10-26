import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
export async function GET(){
 const user=await currentUser();
 if(!user||user.role!=='RIDER')return NextResponse.json({error:'Rider login required'},{status:403});
 const rider=await db.rider.findUnique({where:{userId:user.id}});
 if(!rider||!rider.approved||rider.status!=='ONLINE')return NextResponse.json({requests:[]},{headers:{'Cache-Control':'no-store'}});
 const orders=await db.order.findMany({where:{status:'PLACED',dispatchRequestedAt:{not:null},delivery:null},
  select:{id:true,code:true,deliveryFee:true,codTotal:true,dispatchRequestedAt:true,
   kitchen:{select:{name:true,address:true,latitude:true,longitude:true}},
   address:{select:{details:true,landmark:true,latitude:true,longitude:true}}},
  orderBy:{dispatchRequestedAt:'asc'},take:50});
 return NextResponse.json({requests:orders},{headers:{'Cache-Control':'no-store'}});
}
