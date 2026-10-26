import {requireRole} from '@/lib/auth';
import {db} from '@/lib/db';
import Link from 'next/link';
import MerchantReviews from '@/components/merchant-reviews';
export const dynamic='force-dynamic';
export default async function Admin(){
 const user=await requireRole(['ADMIN']);
 if(!user)return <main className="section container"><h1>Administrator access</h1><p>Please sign in using your authorized admin account.</p><Link className="btn" href="/admin-access">Admin sign in</Link></main>;
 const [merchants,orders,users,kitchens]=await Promise.all([
  db.merchant.findMany({orderBy:{createdAt:'desc'},include:{kitchens:true,members:{include:{user:{select:{name:true,phone:true}}}}}}),
  db.order.count(),db.user.count(),db.kitchen.count()
 ]);
 const pending=merchants.filter(m=>m.status==='PENDING').length;
 const approved=merchants.filter(m=>m.status==='APPROVED').length;
 return <>
   <div className="admin-top" id="overview"><div><div className="admin-breadcrumb">Workspace / <strong>Overview</strong></div><h1>Good to see you, {user.name?.split(' ')[0]||'Admin'} <span>👋</span></h1><p>Manage your kitchens, partners and platform activity in one place.</p></div><Link href="/" className="admin-outline-btn">View storefront ↗</Link></div>
   <div className="admin-stat-grid">
    <div className="admin-stat-card"><span className="admin-stat-icon pink">▣</span><span>Total merchants</span><strong>{merchants.length}</strong><small>Registered partners</small></div>
    <div className="admin-stat-card"><span className="admin-stat-icon amber">◷</span><span>Pending approval</span><strong>{pending}</strong><small>Requires your review</small></div>
    <div className="admin-stat-card"><span className="admin-stat-icon green">✓</span><span>Active partners</span><strong>{approved}</strong><small>Approved merchants</small></div>
    <div className="admin-stat-card"><span className="admin-stat-icon blue">▤</span><span>Total orders</span><strong>{orders}</strong><small>{kitchens} kitchens · {users} users</small></div>
   </div>
   <section id="merchants" className="admin-workspace">
    <div className="admin-section-heading"><div><span className="admin-overline">PARTNER OPERATIONS</span><h2>Merchant approvals</h2><p>Verify food/grocery/stationery shops, their pickup pins and commission.</p></div><span className="admin-pending-pill">{pending} pending</span></div>
    <MerchantReviews merchants={merchants.map(m=>({id:m.id,name:m.name,status:m.status,owner:m.members[0]?.user.name||'Unknown',phone:m.members[0]?.user.phone||'',kitchens:m.kitchens.map(k=>({id:k.id,name:k.name,storeType:k.storeType,address:k.address,latitude:Number(k.latitude),longitude:Number(k.longitude),commissionRate:k.commissionRate===null?10:Number(k.commissionRate)}))}))}/>
   </section>
 </>;
}
