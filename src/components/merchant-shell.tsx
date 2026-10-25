'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {LayoutDashboard,ShoppingBag,BookOpen,Wallet,Settings,Menu,X,Bell,Store,ChevronRight,ArrowLeft,Clock3,ExternalLink} from 'lucide-react';
import LogoutButton from '@/components/logout-button';
type Item={href:string;title:string;icon:typeof LayoutDashboard};
const navigation:Item[]=[
 {href:'/merchant',title:'Dashboard',icon:LayoutDashboard},
 {href:'/merchant/orders',title:'Orders',icon:ShoppingBag},
 {href:'/merchant/menu',title:'Products',icon:BookOpen},
 {href:'/merchant/earnings',title:'Earnings',icon:Wallet},
 {href:'/merchant/settings',title:'Store settings',icon:Settings},
];
const tabs=navigation.slice(0,4);
const titleFor=(path:string)=>navigation.find(n=>path===n.href)?.title||'Merchant portal';
export default function MerchantShell({children,brandName,brandLogoId,name,kitchenName,approved,acceptingOrders,newOrders}:{children:React.ReactNode;brandName:string;brandLogoId?:string;name:string;kitchenName:string;approved:boolean;acceptingOrders:boolean;newOrders:number}){
 const path=usePathname();
 const [drawer,setDrawer]=useState(false);
 const isAuth=path==='/merchant/login'||path==='/merchant/signup';
 useEffect(()=>setDrawer(false),[path]);
 useEffect(()=>{if(!drawer)return;const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')setDrawer(false)};document.addEventListener('keydown',esc);return()=>document.removeEventListener('keydown',esc)},[drawer]);
 if(isAuth)return <>{children}</>;
 const current=titleFor(path);
 const nav=(close?:()=>void)=>navigation.map(item=><Link key={item.href} href={item.href} aria-current={path===item.href?'page':undefined} onClick={close} className={'merchant-nav-link'+(path===item.href?' active':'')}><item.icon size={19} strokeWidth={path===item.href?2.4:1.8}/><span>{item.title}</span>{item.href==='/merchant/orders'&&newOrders>0&&<b className="merchant-nav-count">{newOrders}</b>}</Link>);
 return <div className="merchant-shell">
  <aside className="merchant-sidebar" aria-label="Merchant sidebar">
   <Link href="/merchant" className="merchant-brand"><span className="merchant-brand-icon">{brandLogoId?<img src={"/api/media/branding/"+brandLogoId} alt={brandName+" logo"}/>: "🐼"}</span><div><strong>{brandName}</strong><small>MERCHANT HUB</small></div></Link>
   <div className="merchant-shop-identity"><span>YOUR SHOP</span><strong>{kitchenName}</strong><small className={approved?(acceptingOrders?'is-open':'is-closed'):'is-pending'}>{!approved?'Pending approval':acceptingOrders?'● Accepting orders':'● Currently closed'}</small></div>
   <nav className="merchant-sidebar-links"><p>WORKSPACE</p>{nav()}</nav>
   <div className="merchant-sidebar-bottom"><div className="merchant-sidebar-account"><div className="merchant-account-avatar">{name.slice(0,1).toUpperCase()}</div><div><strong>{name}</strong><small>Merchant account</small></div></div><LogoutButton/></div>
  </aside>
  <div className="merchant-main">
   <header className="merchant-topbar">
    <div className="merchant-topbar-start"><button type="button" className="merchant-mobile-menu-button" aria-label="Open merchant navigation" onClick={()=>setDrawer(true)}><Menu size={22}/></button><div><small>Merchant workspace</small><strong>{current}</strong></div></div>
    <div className="merchant-topbar-end"><span className={'merchant-store-pill'+(approved&&acceptingOrders?' open':'')}>{!approved?'Approval pending':acceptingOrders?'Open for orders':'Shop closed'}</span><Link href="/merchant/orders?status=PLACED" className="merchant-topbar-bell" aria-label={newOrders?newOrders+' new orders':'See orders'}><Bell size={20}/>{newOrders>0&&<b>{newOrders>99?'99+':newOrders}</b>}</Link><span className="merchant-topbar-avatar" title={name}>{name.slice(0,1).toUpperCase()}</span></div>
   </header>
   <div className="merchant-page-content">{children}</div>
  </div>
  <nav className="merchant-mobile-bottom" aria-label="Merchant mobile navigation">{tabs.map(item=><Link href={item.href} aria-current={path===item.href?'page':undefined} className={'merchant-mobile-tab'+(path===item.href?' active':'')} key={item.href}><span className="merchant-tab-icon"><item.icon size={21}/>{item.href==='/merchant/orders'&&newOrders>0&&<i/>}</span><small>{item.title==='Dashboard'?'Home':item.title}</small></Link>)}<button type="button" className={'merchant-mobile-tab'+(drawer||path==='/merchant/settings'?' active':'')} onClick={()=>setDrawer(v=>!v)} aria-expanded={drawer} aria-haspopup="dialog"><Menu size={21}/><small>More</small></button></nav>
  {drawer&&<div className="merchant-mobile-drawer-layer"><button type="button" className="merchant-mobile-drawer-backdrop" onClick={()=>setDrawer(false)} aria-label="Close merchant menu"/><section className="merchant-mobile-drawer" role="dialog" aria-modal="true" aria-label="Merchant navigation"><div className="merchant-mobile-drawer-head"><div><small>MERCHANT HUB</small><strong>{kitchenName}</strong></div><button type="button" aria-label="Close navigation" onClick={()=>setDrawer(false)}><X size={22}/></button></div><nav>{nav(()=>setDrawer(false))}</nav><div className="merchant-mobile-drawer-extra"><Link href="/kitchens" onClick={()=>setDrawer(false)}><ExternalLink size={18}/>View customer storefront<ChevronRight size={16}/></Link><Link href="/" onClick={()=>setDrawer(false)}><ArrowLeft size={18}/>Back to AdPanda<ChevronRight size={16}/></Link></div><div className="merchant-mobile-drawer-signout"><LogoutButton/></div></section></div>}
 </div>;
}
