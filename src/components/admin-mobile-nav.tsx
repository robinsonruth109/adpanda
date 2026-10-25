'use client';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {LayoutDashboard,ClipboardCheck,Store,ShoppingBag,Menu,X,Bike,Users,Wallet,ShieldCheck,ChevronRight,Settings,HandCoins,Palette} from 'lucide-react';
import LogoutButton from '@/components/logout-button';

type NavItem={href:string;label:string;icon:typeof LayoutDashboard};
const tabs:NavItem[]=[
 {href:'/admin',label:'Home',icon:LayoutDashboard},
 {href:'/admin/merchants',label:'Merchants',icon:ClipboardCheck},
 {href:'/admin/kitchens',label:'Stores',icon:Store},
 {href:'/admin/orders',label:'Orders',icon:ShoppingBag},
];
const extra:NavItem[]=[
 {href:'/admin/riders',label:'Riders & dispatch',icon:Bike},
 {href:'/admin/customers',label:'Customers',icon:Users},
 {href:'/admin/finance',label:'COD & settlements',icon:Wallet},
 {href:'/admin/settlements',label:'Merchant payouts',icon:HandCoins},
 {href:'/admin/audit',label:'Audit logs',icon:ShieldCheck},
 {href:'/admin/settings',label:'Delivery settings',icon:Settings},
 {href:'/admin/branding',label:'Branding & content',icon:Palette},
];
export default function AdminMobileNav({pending=0,brandName='AdPanda'}:{pending?:number;brandName?:string}){
 const pathname=usePathname();
 const [more,setMore]=useState(false);
 useEffect(()=>{setMore(false)},[pathname]);
 useEffect(()=>{
  if(!more)return;
  const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setMore(false)};
  window.addEventListener('keydown',close);
  return()=>window.removeEventListener('keydown',close);
 },[more]);
 const extrasSelected=extra.some(item=>pathname===item.href||pathname.startsWith(item.href+'/'));
 return <div className="admin-mobile-navigation">
  {more&&<div className="admin-mobile-menu-layer">
   <button className="admin-mobile-scrim" aria-label="Close admin menu" type="button" onClick={()=>setMore(false)}/>
   <section className="admin-mobile-more-sheet" role="dialog" aria-modal="true" aria-label="More admin pages">
    <div className="admin-mobile-more-heading"><div><span>{brandName}</span><strong>More admin tools</strong></div><button type="button" aria-label="Close menu" onClick={()=>setMore(false)}><X size={21}/></button></div>
    <div className="admin-mobile-menu-links">
     {extra.map(item=><Link href={item.href} key={item.href} className={'admin-mobile-menu-link'+(pathname===item.href?' active':'')} onClick={()=>setMore(false)}><item.icon size={20}/><span>{item.label}</span><ChevronRight size={17}/></Link>)}
    </div>
    <div className="admin-mobile-menu-logout"><LogoutButton/></div>
   </section>
  </div>}
  <nav className="admin-mobile-bottom-nav" aria-label="Admin mobile navigation">
   {tabs.map(item=><Link href={item.href} key={item.href} aria-current={pathname===item.href?'page':undefined} className={'admin-mobile-tab'+(pathname===item.href?' active':'')}><span className="admin-mobile-tab-icon"><item.icon size={21} strokeWidth={pathname===item.href?2.5:1.9}/>{item.href==='/admin/merchants'&&pending>0&&<span className="admin-mobile-tab-badge">{pending>9?'9+':pending}</span>}</span><span>{item.label}</span></Link>)}
   <button className={'admin-mobile-tab'+(more||extrasSelected?' active':'')} type="button" onClick={()=>setMore(value=>!value)} aria-haspopup="dialog" aria-expanded={more}><span className="admin-mobile-tab-icon">{more?<X size={21}/>:<Menu size={21}/>}</span><span>More</span></button>
  </nav>
 </div>;
}
