import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {kitchenAvailability} from '@/lib/kitchen-hours';
export async function GET(){
 const kitchens=await db.kitchen.findMany({
  where:{active:true,merchant:{status:'APPROVED'}},
  select:{
   id:true,name:true,slug:true,description:true,latitude:true,longitude:true,acceptingOrders:true,availabilityMode:true,weeklyHours:true,bannerKey:true,bannerVersion:true,storeType:true,groceryReviewedDate:true,
   categories:{where:{active:true},select:{
    name:true,items:{select:{id:true,name:true,description:true,price:true,available:true}}
   }}
  }
 });
 return NextResponse.json({kitchens:kitchens.map(k=>({...k,acceptingOrders:kitchenAvailability({...k,merchant:{status:'APPROVED'}}).open,hasBanner:Boolean(k.bannerKey),bannerKey:undefined,groceryReviewedDate:undefined,weeklyHours:undefined}))});
}
