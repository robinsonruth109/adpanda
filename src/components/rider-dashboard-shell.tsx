'use client';
import {useState} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import Link from 'next/link';
import {LayoutDashboard,PackageCheck,Radio,Wallet,MapPinned,Menu,X,Bike,Clock3,ShieldCheck,ChevronRight,LogOut} from 'lucide-react';
const nav=[
 {id:'overview',label:'Overview',Icon:LayoutDashboard},
 {id:'requests',label:'Available requests',Icon:Radio},
 {id:'deliveries',label:'My deliveries',Icon:PackageCheck},
 {id:'location',label:'Live GPS',Icon:MapPinned},
 {id:'wallet',label:'Cash & wallet',Icon:Wallet},
] as const;
export default function RiderDashboardShell({children,name,status,approved,activeCount,overdue=[]}:{children:React.ReactNode;name:string;status:string;approved:boolean;activeCount:number;overdue?:{date:string;amount:string}[]}){
 const router=useRouter();
 const [loggingOut,setLoggingOut]=useState(false);
 const [logoutError,setLogoutError]=useState('');
 async function signOut(){
  if(loggingOut)return;
  setLoggingOut(true);setLogoutError('');
  try{
   const response=await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'});
   if(!response.ok)throw new Error('Logout failed. Please retry.');
   router.replace('/rider/login');router.refresh();
  }catch(error){setLogoutError(error instanceof Error?error.message:'Could not sign out');setLoggingOut(false);}
 }
 const [open,setOpen]=useState(false);
 const pathname=usePathname();
 const selected=pathname==='/rider'?'overview':pathname.split('/')[2]||'overview';
 return <div className="rd-shell">
 <aside className={'rd-sidebar'+(open?' rd-sidebar-open':'')} aria-label="Rider navigation">
  <div className="rd-side-brand"><span className="rd-brand-icon"><Bike size={22}/></span><span><strong>ad<span>panda</span></strong><small>RIDER WORKSPACE</small></span><button className="rd-close" onClick={()=>setOpen(false)} aria-label="Close menu"><X size={20}/></button></div>
  <div className="rd-side-label">WORKSPACE</div>
  <nav className="rd-side-nav">{nav.map(({id,label,Icon})=><Link key={id} href={id==='overview'?'/rider':'/rider/'+id} onClick={()=>setOpen(false)} aria-current={selected===id?'page':undefined} className={'rd-side-link'+(selected===id?' active':'')}><Icon size={19}/><span>{label}</span>{id==='deliveries'&&activeCount>0&&<span className="rd-side-count">{activeCount}</span>}</Link>)}</nav>
  <button type="button" className="rd-logout" onClick={signOut} disabled={loggingOut}><LogOut size={19}/><span>{loggingOut?'Signing out...':'Log out'}</span></button>
  {logoutError&&<p role="alert" className="rd-logout-error">{logoutError}</p>}
  <div className="rd-side-footer"><div className="rd-side-foot-icon"><ShieldCheck size={20}/></div><div><strong>{approved?'Verified rider':'Approval pending'}</strong><small>{approved?'Your account is approved':'Admin approval required'}</small></div></div>
 </aside>
 {open&&<button type="button" className="rd-scrim" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}
 <div className="rd-workspace">
  <header className="rd-topbar"><div className="rd-top-left"><button type="button" className="rd-menu" onClick={()=>setOpen(true)} aria-label="Open rider menu"><Menu size={22}/></button><div><span className="rd-top-eyebrow">DELIVERY PARTNER PORTAL</span><strong>{nav.find(n=>n.id===selected)?.label||'Rider Dashboard'}</strong></div></div><div className="rd-top-right"><span className={'rd-presence '+status.toLowerCase()}><span className="rd-presence-dot"/>{status}</span><div className="rd-avatar" aria-label={'Signed in as '+name}>{name.trim().slice(0,1).toUpperCase()}</div><button type="button" className="rd-top-logout" title="Log out" aria-label="Log out" disabled={loggingOut} onClick={signOut}><LogOut size={18}/></button></div></header>
  <div className="rd-body">{overdue.length>0&&<div role="alert" className="rider-alert" style={{margin:'14px 0',border:'2px solid #ef9a9a',background:'#fff3f3',padding:18}}><strong>AdPanda commission overdue — new requests suspended.</strong><p>Previous-day amount: ৳{overdue.reduce((n,d)=>n+Number(d.amount),0).toFixed(2)}. Please pay AdPanda, upload proof in your <Link href="/rider/wallet">Wallet</Link>, and wait for Admin verification before accepting new deliveries.</p></div>}{children}</div>
 </div>
 <nav className="rd-mobile-nav" aria-label="Mobile rider navigation">{nav.filter(n=>n.id!=='location').map(({id,label,Icon})=><Link key={id} href={id==='overview'?'/rider':'/rider/'+id} className={selected===id?'active':''} aria-current={selected===id?'page':undefined}><Icon size={22}/><span>{id==='requests'?'Requests':id==='deliveries'?'Orders':id==='wallet'?'Wallet':'Home'}</span></Link>)}</nav>
 </div>;
}
