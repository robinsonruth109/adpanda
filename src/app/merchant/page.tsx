import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import Link from 'next/link';
import {Store,ShoppingBag,Clock3,CheckCheck,Wallet,ArrowUpRight,UtensilsCrossed,Bell,MapPin,Truck} from 'lucide-react';
import MerchantApplication from '@/components/merchant-application';
import KitchenAvailability from '@/components/kitchen-availability';
import {kitchenAvailability} from '@/lib/kitchen-hours';
export const dynamic='force-dynamic';
function dhakaStart(){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const get=(key:string)=>parts.find(p=>p.type===key)?.value||'01';
 return new Date(get('year')+'-'+get('month')+'-'+get('day')+'T00:00:00+06:00');
}
export default async function MerchantDashboard(){
 const user=await currentUser();
 if(!user)return <main className="section container"><h1>Become an AdPanda merchant</h1><p>Open your cloud kitchen in Alamdanga. Sign in to apply.</p><div className="links"><Link href="/merchant/signup" className="btn">Become a merchant</Link><Link href="/merchant/login" className="btn secondary">Merchant sign in</Link></div></main>;
 const merchants=await db.merchant.findMany({where:{members:{some:{userId:user.id}}},include:{kitchens:{include:{categories:{include:{_count:{select:{items:true}}}}}}}});
 if(!merchants.length)return <main className="section container"><div className="eyebrow">Merchant onboarding</div><h1>Welcome, {user.name}</h1><p>Register your first kitchen for Admin approval.</p><MerchantApplication/></main>;
 const ids=merchants.flatMap(m=>m.kitchens.map(k=>k.id)),today=dhakaStart();
 const [todayOrders,activeOrders,totalOrders,deliveredToday,recent,completed,allItems]=await Promise.all([
  db.order.count({where:{kitchenId:{in:ids},placedAt:{gte:today}}}),
  db.order.count({where:{kitchenId:{in:ids},status:{notIn:['DELIVERED','FAILED','CANCELLED']}}}),
  db.order.count({where:{kitchenId:{in:ids}}}),
  db.orderEvent.findMany({where:{order:{kitchenId:{in:ids}},toStatus:'DELIVERED',createdAt:{gte:today}},select:{orderId:true}}),
  db.order.findMany({where:{kitchenId:{in:ids}},orderBy:{placedAt:'desc'},take:6,include:{customer:{select:{name:true}},kitchen:{select:{name:true}}}}),
  db.order.count({where:{kitchenId:{in:ids},status:'DELIVERED'}}),
  db.menuItem.count({where:{category:{kitchenId:{in:ids}}}})
 ]);
 const todayRevenue=deliveredToday.length?await db.order.aggregate({where:{id:{in:[...new Set(deliveredToday.map(e=>e.orderId))]}},_sum:{foodSubtotal:true}}):null;
 const newOrders=recent.filter(o=>o.status==='PLACED').length;
 return <div className="merchant-workspace-page">
  <div className="merchant-dashboard-greeting"><div><span className="merchant-kicker">MERCHANT OVERVIEW</span><h1>Good to see you, {user.name.split(' ')[0]} <span>👋</span></h1><p>Here is what is happening across your kitchens today.</p></div><Link href="/merchant/orders" className="merchant-primary-button"><ShoppingBag size={18}/> View orders <ArrowUpRight size={16}/></Link></div>
  <div className="merchant-dashboard-kpis">
   <div className="merchant-dashboard-kpi"><span className="pink"><ShoppingBag size={20}/></span><small>Orders placed today</small><strong>{todayOrders}</strong><p>Customer orders placed today</p></div>
   <div className="merchant-dashboard-kpi"><span className="amber"><Clock3 size={20}/></span><small>Active orders</small><strong>{activeOrders}</strong><p>Currently in progress</p></div>
   <div className="merchant-dashboard-kpi"><span className="green"><CheckCheck size={20}/></span><small>Delivered today</small><strong>{deliveredToday.length}</strong><p>Food sales: ৳{Number(todayRevenue?._sum.foodSubtotal||0).toFixed(2)}</p></div>
   <div className="merchant-dashboard-kpi"><span className="purple"><UtensilsCrossed size={20}/></span><small>Menu items</small><strong>{allItems}</strong><p>Across your kitchens</p></div>
  </div>
  <div className="merchant-dashboard-columns">
   <section className="merchant-dashboard-surface"><div className="merchant-surface-heading"><div><span className="merchant-kicker">ORDER ACTIVITY</span><h2>Recent orders</h2></div><Link href="/merchant/orders">View all →</Link></div>
    {recent.map(o=><Link href="/merchant/orders" className="merchant-dashboard-order" key={o.id}><span className="merchant-dashboard-order-symbol"><ShoppingBag size={18}/></span><div><strong>{o.code}</strong><small>{o.recipientName||o.customer?.name||'Guest customer'} · {o.kitchen.name}</small></div><span className={'merchant-status-chip '+o.status.toLowerCase()}>{o.status.replaceAll('_',' ')}</span><strong>৳{Number(o.codTotal).toFixed(2)}</strong></Link>)}
    {!recent.length&&<div className="merchant-empty-state"><ShoppingBag size={30}/><h3>No orders yet</h3><p>New customer orders will appear here.</p></div>}
   </section>
   <aside className="merchant-dashboard-side">
    <section className="merchant-dashboard-surface"><div className="merchant-surface-heading"><div><span className="merchant-kicker">QUICK ACTIONS</span><h2>Manage your shop</h2></div></div><div className="merchant-quick-action-links"><Link href="/merchant/menu"><UtensilsCrossed size={20}/> Manage food menu <ArrowUpRight size={17}/></Link><Link href="/merchant/earnings"><Wallet size={20}/> Earnings & payouts <ArrowUpRight size={17}/></Link><Link href="/merchant/orders?status=PLACED"><Bell size={20}/> New orders <ArrowUpRight size={17}/></Link><Link href="/merchant/settings"><Store size={20}/> Kitchen settings <ArrowUpRight size={17}/></Link></div></section>
    <section className="merchant-dashboard-surface merchant-dashboard-summary"><div className="merchant-surface-heading"><h2>Your business</h2></div><p><span>Total orders</span><strong>{totalOrders}</strong></p><p><span>Lifetime delivered</span><strong>{completed}</strong></p><p><span>Merchant accounts</span><strong>{merchants.length}</strong></p></section>
   </aside>
  </div>
  <section className="merchant-dashboard-surface merchant-dashboard-kitchens"><div className="merchant-surface-heading"><div><span className="merchant-kicker">KITCHEN CONTROLS</span><h2>My kitchens</h2></div><Link href="/merchant/settings">Store settings →</Link></div>
   {merchants.flatMap(m=>m.kitchens.map(k=><div className="merchant-dashboard-kitchen" key={k.id}><div className="merchant-kitchen-overview"><span className="merchant-dashboard-order-symbol"><Store size={23}/></span><div><strong>{k.name}</strong><small><MapPin size={14}/>{k.address}</small><span className={'merchant-status-chip '+m.status.toLowerCase()}>{m.status}</span></div></div><div className="merchant-kitchen-details"><span>Platform commission: <strong>{k.commissionRate===null?'Not set':k.commissionRate.toString()+'%'}</strong></span><span>Menu items: <strong>{k.categories.reduce((n,c)=>n+c._count.items,0)}</strong></span></div>{m.status==='APPROVED'?<KitchenAvailability id={k.id} initial={kitchenAvailability({...k,merchant:{status:m.status}}).open} mode={k.availabilityMode}/>:<p className="merchant-small-note">Kitchen must be approved before accepting orders.</p>}</div>))}
  </section>
 </div>;
}
