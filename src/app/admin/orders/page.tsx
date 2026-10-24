import {db} from '@/lib/db';
import AdminOrderManager from '@/components/admin-order-manager';
export const dynamic='force-dynamic';
export default async function Page(){
 const [orders,riders]=await Promise.all([
  db.order.findMany({orderBy:{placedAt:'desc'},take:100,include:{
   customer:{select:{name:true,phone:true}},
   kitchen:{select:{name:true}},
   address:{select:{details:true,landmark:true}},
   delivery:{include:{rider:{include:{user:{select:{name:true}}}}}}
  }}),
  db.rider.findMany({where:{approved:true,status:'ONLINE'},include:{user:{select:{name:true,phone:true}}},orderBy:{user:{name:'asc'}}})
 ]);
 return <section className="admin-orders-page">
  <div className="admin-breadcrumb">Operations / <strong>Orders & dispatch</strong></div>
  <span className="admin-overline">ORDER OPERATIONS</span>
  <h1>Order management</h1>
  <p className="muted">Review orders, advance order statuses and manually assign delivery riders.</p>
  <AdminOrderManager initialOrders={orders.map(o=>({
   id:o.id,code:o.code,status:o.status,customer:o.customer.name,phone:o.customer.phone,kitchen:o.kitchen.name,
   address:[o.address.details,o.address.landmark].filter(Boolean).join(' · '),
   codTotal:Number(o.codTotal),placedAt:o.placedAt.toISOString(),riderId:o.delivery?.riderId||null,
   riderName:o.delivery?.rider.user.name||null
  }))} availableRiders={riders.map(r=>({id:r.id,name:r.user.name,phone:r.user.phone}))}/>
 </section>;
}
