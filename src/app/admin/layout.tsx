import Link from 'next/link';
import LogoutButton from '@/components/logout-button';
import AdminNav from '@/components/admin-nav';
import AdminMobileNav from '@/components/admin-mobile-nav';
import {Bell,Search,PanelLeft} from 'lucide-react';
import {requireRole} from '@/lib/auth';
import {db} from '@/lib/db';
import type {ReactNode} from 'react';
export default async function AdminLayout({children}:{children:ReactNode}){
 const admin=await requireRole(['ADMIN']);
 if(!admin)return <main className="section container"><h1>Admin access required</h1><p>Please sign in to continue.</p><Link className="btn" href="/login">Sign in</Link></main>;
 const pending=await db.merchant.count({where:{status:'PENDING'}});
 return <div className="admin-shell">
 <aside className="admin-sidebar">
  <Link href="/admin" className="admin-sidebar-brand"><span className="admin-brand-icon">🐼</span><div><strong>ad<span style={{color:'#e21b70'}}>panda</span></strong><small>CONTROL CENTER</small></div></Link>
  <AdminNav pending={pending}/>
  <div className="admin-sidebar-bottom">AdPanda · Alamdanga<br/><small>Signed in as {admin.name}</small><LogoutButton/></div>
 </aside>
 <div className="admin-main">
  <header className="admin-toolbar"><div className="admin-toolbar-title"><PanelLeft size={21}/><div><strong>AdPanda Control Center</strong><small>Secure administration workspace</small></div></div><div className="admin-toolbar-right"><div className="admin-toolbar-search"><Search size={17}/><span>Manage kitchens, partners & orders</span></div><span className="admin-notice" title={pending+' pending merchant applications'}><Bell size={19}/>{pending>0&&<b>{pending}</b>}</span><div className="admin-avatar">{admin.name?.slice(0,1).toUpperCase()||'A'}</div><div className="admin-toolbar-user"><strong>{admin.name}</strong><small>Super Admin</small></div></div></header>
  <div className="admin-content">{children}</div>
 </div>
 <AdminMobileNav pending={pending}/>
 </div>;
}