import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import MerchantOrdersManager from '@/components/merchant-orders-manager';
import Link from 'next/link';
export const dynamic='force-dynamic';
export default async function MerchantOrdersPage(){
 const user=await currentUser();
 if(!user)return <main className="section container"><h1>Merchant orders</h1><Link href="/merchant/login" className="btn">Merchant login</Link></main>;
 const memberships=await db.merchantMember.findMany({where:{userId:user.id},select:{merchantId:true}});
 const ids=memberships.map(x=>x.merchantId);
 const orders=ids.length?await db.order.findMany({where:{kitchen:{merchantId:{in:ids}}},orderBy:{placedAt:'desc'},take:100,include:{items:true,address:{select:{details:true,landmark:true}},customer:{select:{name:true,phone:true}},kitchen:{select:{name:true}},delivery:{select:{rider:{select:{user:{select:{name:true}}}}}}}}):[];
 return <section className="merchant-workspace-page">
  <div className="merchant-page-intro"><div><span className="merchant-kicker">KITCHEN OPERATIONS</span><h1>Order management</h1><p>Accept new orders, prepare food and hand over orders to the assigned rider.</p></div><span className="merchant-intro-pill">{orders.filter(o=>o.status==='PLACED').length} new orders</span></div>
  <MerchantOrdersManager initial={orders.map(o=>({id:o.id,code:o.code,status:o.status,customer:o.customer.name,phone:o.customer.phone,address:[o.address.details,o.address.landmark].filter(Boolean).join(' · '),kitchen:o.kitchen.name,items:o.items.map(i=>({name:i.itemName,quantity:i.quantity,lineTotal:Number(i.lineTotal)})),codTotal:Number(o.codTotal),foodSubtotal:Number(o.foodSubtotal),placedAt:o.placedAt.toISOString(),rider:o.delivery?.rider.user.name||null}))}/>
 </section>;
}
