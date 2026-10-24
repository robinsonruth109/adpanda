import Link from 'next/link';
import LogoutButton from '@/components/logout-button';
import {requireRole} from '@/lib/auth';
import {db} from '@/lib/db';
import type {ReactNode} from 'react';

const groups=[
 {title:'OVERVIEW',items:[['Dashboard','/admin'],['Merchant approvals','/admin/merchants']]},
 {title:'OPERATIONS',items:[['Kitchens','/admin/kitchens'],['Orders','/admin/orders'],['Riders & dispatch','/admin/riders'],['Customers','/admin/customers']]},
 {title:'FINANCE',items:[['COD & settlements','/admin/finance']]},
 {title:'SECURITY',items:[['Audit logs','/admin/audit']]}
];
export default async function AdminLayout({children}:{children:ReactNode}){
 const admin=await requireRole(['ADMIN']);
 if(!admin)return <main className="section container"><h1>Admin access required</h1><p>Please sign in to continue.</p><Link className="btn" href="/login">Sign in</Link></main>;
 const pending=await db.merchant.count({where:{status:'PENDING'}});
 return <div className="admin-shell">
 <aside className="admin-sidebar">
  <div className="admin-sidebar-brand"><span className="admin-brand-icon">🐼</span><div><strong>AdPanda</strong><small>CONTROL CENTER</small></div></div>
  {groups.map(g=><div key={g.title}><p className="admin-menu-label">{g.title}</p>{g.items.map(([name,href])=><Link key={href} href={href} className="admin-sidebar-link"><span>{name}</span>{href==='/admin/merchants'&&pending>0?<span className="admin-count">{pending}</span>:null}</Link>)}</div>)}
  <div className="admin-sidebar-bottom">AdPanda · Alamdanga<br/><small>Signed in: {admin.name}</small><LogoutButton /></div>
 </aside>
 <div className="admin-content">{children}</div>
 </div>;
}
