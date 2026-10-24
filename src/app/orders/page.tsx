import Link from 'next/link';
import {requireRole} from '@/lib/auth';
import {db} from '@/lib/db';
import {ShoppingBag,ChevronRight} from 'lucide-react';
export const dynamic='force-dynamic';
export default async function Orders(){
 const user=await requireRole(['CUSTOMER']);
 if(!user)return <main className="section container"><h1>My orders</h1><p>Sign in with a customer account to view your orders.</p><Link href="/login" className="btn">Sign in</Link></main>;
 const orders=await db.order.findMany({where:{customerId:user.id},orderBy:{placedAt:'desc'},take:50,include:{kitchen:{select:{name:true}},_count:{select:{items:true}}}});
 return <main className="section container customer-orders-list"><span className="admin-overline">MY ADPANDA</span><h1>Your orders</h1><p className="muted">Track deliveries, check order history and review COD payments.</p>
 <div className="customer-orders-cards">{orders.map(o=><Link className="customer-orders-list-item" href={'/orders/'+o.id} key={o.id}><div className="customer-orders-icon"><ShoppingBag size={23}/></div><div><strong>{o.kitchen.name}</strong><small>{o.code} · {o._count.items} products · {o.placedAt.toLocaleString('en-BD',{timeZone:'Asia/Dhaka'})}</small><span className={'admin-order-badge '+o.status.toLowerCase()}>{o.status.replaceAll('_',' ')}</span></div><div className="customer-orders-cost"><strong>৳{Number(o.codTotal).toFixed(2)}</strong><ChevronRight size={19}/></div></Link>)}</div>
 {!orders.length&&<div className="admin-empty"><ShoppingBag size={34}/><h3>No orders yet</h3><p>Browse approved kitchens and place your first order.</p><Link href="/kitchens" className="btn">Find food</Link></div>}
 </main>;
}
