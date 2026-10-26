import {requireRole} from '@/lib/auth';
import {db} from '@/lib/db';
import Link from 'next/link';
import {BarChart3,CheckCircle2,Clock3,ShoppingBag,Store,Truck,Users,Wallet,ArrowUpRight,ShieldCheck,Package} from 'lucide-react';
import {dhakaDate} from '@/lib/kitchen-hours';
import {storeTypeContent,storeTypes} from '@/lib/store-types';
import AdminPendingQueue from '@/components/admin-pending-queue';
export const dynamic='force-dynamic';

const money=(amount:number)=>'৳'+amount.toLocaleString('en-BD',{minimumFractionDigits:2,maximumFractionDigits:2});
const num=(amount:number)=>amount.toLocaleString('en-BD');

export default async function Admin(){
 const user=await requireRole(['ADMIN']);
 if(!user)return <main className="section container"><h1>Administrator access required</h1><p>Please sign in to continue.</p><Link className="btn" href="/admin-access">Admin sign in</Link></main>;
 const now=new Date();
 const today=dhakaDate(now);
 const localMidnight=new Date(today+'T00:00:00+06:00');
 const tomorrow=new Date(localMidnight.getTime()+86400000);
 const days=Array.from({length:7},(_,i)=>{
  const start=new Date(localMidnight.getTime()+(i-6)*86400000);
  const end=new Date(start.getTime()+86400000);
  return {date:dhakaDate(start),start,end,weekday:new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone:'Asia/Dhaka'}).format(start)};
 });
 const [merchantGroups,pendingApplications,storeGroups,customerCount,products,orderStatuses,todayOrders,deliveredSales,codCollections,cashDeposits,
  recentOrders,approvedRiders,settlementsPaid,weeklyCounts]=await Promise.all([
  db.merchant.groupBy({by:['status'],_count:{_all:true}}),
  db.merchant.findMany({where:{status:'PENDING'},orderBy:{createdAt:'asc'},take:12,
   include:{members:{include:{user:{select:{name:true,phone:true}}}},kitchens:true}}),
  db.kitchen.groupBy({by:['storeType'],_count:{_all:true}}),
  db.user.count({where:{role:'CUSTOMER'}}),
  db.menuItem.count(),
  db.order.groupBy({by:['status'],_count:{_all:true}}),
  db.order.count({where:{placedAt:{gte:localMidnight,lt:tomorrow}}}),
  db.order.aggregate({where:{status:'DELIVERED'},_sum:{foodSubtotal:true,commissionAmount:true,merchantPayable:true},_count:{_all:true}}),
  db.codCollection.aggregate({_sum:{amount:true}}),
  db.cashDeposit.aggregate({_sum:{amount:true}}),
  db.order.findMany({orderBy:{placedAt:'desc'},take:6,select:{
   id:true,code:true,status:true,recipientName:true,codTotal:true,placedAt:true,
   kitchen:{select:{name:true,storeType:true}}
  }}),
  db.rider.count({where:{approved:true}}),
  db.merchantSettlement.aggregate({where:{status:'PAID'},_sum:{amount:true}}),
  Promise.all(days.map(day=>db.order.count({where:{placedAt:{gte:day.start,lt:day.end}}})))
 ]);
 const merchantCount=merchantGroups.reduce((sum,m)=>sum+m._count._all,0);
 const storeCount=storeGroups.reduce((sum,m)=>sum+m._count._all,0);
 const totalOrders=orderStatuses.reduce((sum,s)=>sum+s._count._all,0);
 const deliveredCount=deliveredSales._count._all;
 const pending=merchantGroups.find(m=>m.status==='PENDING')?._count._all||0;
 const activeOrders=orderStatuses.filter(s=>!['DELIVERED','CANCELLED','FAILED'].includes(s.status)).reduce((n,s)=>n+s._count._all,0);
 const collected=Number(codCollections._sum.amount||0);
 const deposited=Number(cashDeposits._sum.amount||0);
 const earned=Number(deliveredSales._sum.commissionAmount||0);
 const deliveredValue=Number(deliveredSales._sum.foodSubtotal||0);
 const topKpis=[
  {name:'Orders today',value:num(todayOrders),hint:'Placed today · Bangladesh time',icon:ShoppingBag,tone:'pink'},
  {name:'Total orders',value:num(totalOrders),hint:activeOrders+' currently active',icon:BarChart3,tone:'blue'},
  {name:'Delivered product sales',value:money(deliveredValue),hint:deliveredCount+' delivered orders · booked value',icon:Wallet,tone:'green'},
  {name:'Platform commission',value:money(earned),hint:'Commission on delivered orders, not paid cash',icon:CheckCircle2,tone:'purple'}
 ];
 const otherKpis=[
  {name:'Merchants',value:num(merchantCount),hint:(merchantGroups.find(m=>m.status==='APPROVED')?._count._all||0)+' approved',icon:Store},
  {name:'Stores',value:num(storeCount),hint:storeTypes.map(t=>storeTypeContent[t].emoji+' '+(storeGroups.find(x=>x.storeType===t)?._count._all||0)).join(' · '),icon:Store},
  {name:'Customers',value:num(customerCount),hint:num(products)+' catalog products',icon:Users},
  {name:'Riders',value:num(approvedRiders),hint:activeOrders+' orders in progress',icon:Truck}
 ];
 const high=Math.max(1,...weeklyCounts);
 return <div className="adp-admin-dashboard">
  <div className="admin-top" id="overview"><div><div className="admin-breadcrumb">Workspace / <strong>Business overview</strong></div>
   <h1>AdPanda business overview</h1><p>Live marketplace statistics, orders and financial performance · {today} (Asia/Dhaka)</p></div>
   <Link href="/admin/finance" className="admin-outline-btn">View finance <ArrowUpRight size={15}/></Link>
  </div>
  <div className="adp-admin-business-kpis">{topKpis.map(k=><article className={'adp-admin-business-kpi '+k.tone} key={k.name}>
   <span className="adp-admin-business-kpi-icon"><k.icon size={21}/></span><small>{k.name}</small>
   <strong>{k.value}</strong><p>{k.hint}</p>
  </article>)}</div>
  <div className="adp-admin-secondary-kpis">{otherKpis.map(k=><div key={k.name}>
   <span><k.icon size={18}/>{k.name}</span><strong>{k.value}</strong><small>{k.hint}</small>
  </div>)}</div>
  <div className="adp-admin-dashboard-columns">
   <section className="adp-admin-dashboard-panel">
    <div className="adp-admin-panel-header"><div><span className="admin-overline">BUSINESS ANALYTICS</span><h2>Orders · last 7 days</h2><p>Orders created each Bangladesh calendar day</p></div>
     <span className="adp-admin-chart-total">{weeklyCounts.reduce((a,n)=>a+n,0)} orders</span></div>
    <div className="adp-admin-order-chart" role="img" aria-label={days.map((d,i)=>d.date+': '+weeklyCounts[i]+' orders').join(', ')}>
     {days.map((d,i)=><div className="adp-admin-chart-day" key={d.date}>
      <strong>{weeklyCounts[i]}</strong><div className="adp-admin-chart-track"><div style={{height:weeklyCounts[i]===0?'3px':Math.max(6,weeklyCounts[i]/high*100)+'%'}}/></div>
      <span>{d.weekday}</span>
     </div>)}
    </div>
   </section>
   <section className="adp-admin-dashboard-panel">
    <div className="adp-admin-panel-header"><div><span className="admin-overline">OPERATIONS</span><h2>Business pulse</h2><p>Fulfilment and cash position</p></div></div>
    <div className="adp-admin-business-pulse">
     <div><span><Clock3 size={16}/> Active orders</span><strong>{activeOrders}</strong></div>
     <div><span><CheckCircle2 size={16}/> Delivered orders</span><strong>{deliveredCount}</strong></div>
     <div><span><Wallet size={16}/> Rider COD recorded</span><strong>{money(collected)}</strong></div>
     <div><span><Wallet size={16}/> Cash handed to Admin</span><strong>{money(deposited)}</strong></div>
     <div><span><ShieldCheck size={16}/> Merchant payouts paid</span><strong>{money(Number(settlementsPaid._sum.amount||0))}</strong></div>
    </div>
    <small className="adp-admin-business-caveat">Delivered sales and commission are booked order values; COD collected and cash deposited are tracked separately.</small>
   </section>
  </div>
  <section className="adp-admin-dashboard-panel adp-admin-recent-orders">
   <div className="adp-admin-panel-header"><div><span className="admin-overline">RECENT ACTIVITY</span><h2>Latest orders</h2><p>Recent customer checkouts across all shop types</p></div>
    <Link href="/admin/orders">View all orders <ArrowUpRight size={15}/></Link></div>
   <div className="adp-admin-recent-list">{recentOrders.map(o=><div key={o.id} className="adp-admin-recent-order">
     <span className="adp-admin-recent-icon">{storeTypeContent[o.kitchen.storeType].emoji}</span>
     <div><strong>{o.code}</strong><small>{o.kitchen.name} · {o.recipientName||'Customer'}</small></div>
     <span className={'merchant-status '+(o.status==='DELIVERED'?'approved':o.status==='CANCELLED'?'rejected':'pending')}>{o.status.replaceAll('_',' ')}</span>
     <strong>{money(Number(o.codTotal))}</strong>
    </div>)}
    {!recentOrders.length&&<p className="adp-admin-no-orders"><Package size={21}/> No orders yet. Incoming customer orders will appear here.</p>}
   </div>
  </section>
  {pending>0&&<section className="adp-admin-dashboard-panel adp-admin-pending-block" id="merchants">
   <div className="adp-admin-panel-header"><div><span className="admin-overline">ACTION REQUIRED</span><h2>Pending merchant applications</h2>
    <p>Only merchants awaiting approval or rejection are shown here.</p></div><span className="admin-pending-pill">{pending} pending</span></div>
   <AdminPendingQueue applications={pendingApplications.map(m=>({
    id:m.id,name:m.name,owner:m.members[0]?.user.name||'Unknown',phone:m.members[0]?.user.phone||'',
    shops:m.kitchens.map(k=>({id:k.id,name:k.name,type:k.storeType,address:k.address,latitude:Number(k.latitude),longitude:Number(k.longitude)}))
   }))}/>
  </section>}
 </div>;
}
