import 'server-only';
import {db} from '@/lib/db';

export async function adminMerchantOverview(pendingOnly=false){
 const merchants=await db.merchant.findMany({
  where:pendingOnly?{status:'PENDING'}:undefined,
  orderBy:{createdAt:'desc'},
  include:{
   members:{include:{user:{select:{name:true,phone:true}}}},
   kitchens:{include:{categories:{select:{_count:{select:{items:true}}}}}}
  }
 });
 const ids=merchants.flatMap(m=>m.kitchens.map(k=>k.id));
 const allOrders=ids.length?await db.order.groupBy({
  by:['kitchenId'],where:{kitchenId:{in:ids}},_count:{_all:true}
 }):[];
 const delivered=ids.length?await db.order.groupBy({
  by:['kitchenId'],where:{kitchenId:{in:ids},status:'DELIVERED'},
  _count:{_all:true},_sum:{foodSubtotal:true,commissionAmount:true}
 }):[];
 const ordersMap=new Map(allOrders.map(row=>[row.kitchenId,row._count._all]));
 const deliveredMap=new Map(delivered.map(row=>[row.kitchenId,{
  count:row._count._all,sales:Number(row._sum.foodSubtotal||0),commission:Number(row._sum.commissionAmount||0)
 }]));
 return merchants.map(m=>({
  id:m.id,name:m.name,status:m.status,owner:m.members[0]?.user.name||'Unknown',
  phone:m.members[0]?.user.phone||'',createdAt:m.createdAt.toISOString(),
  kitchens:m.kitchens.map(k=>{
   const earned=deliveredMap.get(k.id);
   return {
    id:k.id,name:k.name,storeType:k.storeType,address:k.address,
    latitude:Number(k.latitude),longitude:Number(k.longitude),
    commissionRate:k.commissionRate===null?null:Number(k.commissionRate),
    products:k.categories.reduce((n,c)=>n+c._count.items,0),
    orders:ordersMap.get(k.id)||0,
    delivered:earned?.count||0,
    deliveredSales:earned?.sales||0,
    bookedCommission:earned?.commission||0,
    active:k.active,
    createdAt:m.createdAt.toISOString()
   };
  })
 }));
}
export type AdminMerchantData=Awaited<ReturnType<typeof adminMerchantOverview>>[number];
