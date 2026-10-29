import Link from 'next/link';
import LogoutButton from '@/components/logout-button';
import AdminNav from '@/components/admin-nav';
import AdminMobileNav from '@/components/admin-mobile-nav';
import {Bell,Search,PanelLeft} from 'lucide-react';
import {requireRole} from '@/lib/auth';
import {db} from '@/lib/db';
import {getBranding,getPublicBrandAssets} from '@/lib/site-branding';
import type {ReactNode} from 'react';
export default async function AdminLayout({children}:{children:ReactNode}){
 const admin=await requireRole(['ADMIN']);
 if(!admin)return <main className="section container"><h1>Admin access required</h1><p>Please sign in to continue.</p><Link className="btn" href="/admin-access">Admin sign in</Link></main>;
 const [pending,riderRequests,brand,assets]=await Promise.all([db.merchant.count({where:{status:'PENDING'}}),db.order.count({where:{status:'PLACED',dispatchRequestedAt:{not:null},delivery:{is:null}}}),getBranding(),getPublicBrandAssets()]);
 const logoId=assets.find(asset=>asset.kind==='LOGO')?.id;
 return <div className="admin-shell">
 <aside className="admin-sidebar">
  <Link href="/admin" className="admin-sidebar-brand"><span className="admin-brand-icon">{logoId?<img src={"/api/media/branding/"+logoId} alt={brand.brandName+" logo"}/>: "🐼"}</span><div><strong>{brand.brandName}</strong><small>CONTROL CENTER</small></div></Link>
  <AdminNav pending={pending} riderRequests={riderRequests}/>
  <div className="admin-sidebar-bottom">{brand.brandName} · Alamdanga<br/><small>Signed in as {admin.name}</small><LogoutButton redirectTo="/admin-access"/></div>
 </aside>
 <div className="admin-main">
  <header className="admin-toolbar"><div className="admin-toolbar-title"><PanelLeft size={21}/><div><strong>{brand.brandName} Control Center</strong><small>Secure administration workspace</small></div></div><div className="admin-toolbar-right"><div className="admin-toolbar-search"><Search size={17}/><span>Manage kitchens, partners & orders</span></div><Link href="/admin/orders" className="admin-notice" title={riderRequests+' delivery rider requests waiting'}><Bell size={19}/>{riderRequests>0&&<b>{riderRequests}</b>}</Link><div className="admin-avatar">{admin.name?.slice(0,1).toUpperCase()||'A'}</div><div className="admin-toolbar-user"><strong>{admin.name}</strong><small>Super Admin</small></div></div></header>
  <div className="admin-content">{children}</div>
 </div>
 <AdminMobileNav pending={pending} riderRequests={riderRequests} brandName={brand.brandName}/>
 </div>;
}