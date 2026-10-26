'use client';
import {useState} from 'react';
import Link from 'next/link';
import {LayoutDashboard,PackageCheck,Radio,Wallet,MapPinned,Menu,X,Bike,Clock3,ShieldCheck,ChevronRight} from 'lucide-react';
const nav=[
 {id:'overview',label:'Overview',Icon:LayoutDashboard},
 {id:'requests',label:'Available requests',Icon:Radio},
 {id:'deliveries',label:'My deliveries',Icon:PackageCheck},
 {id:'location',label:'Live GPS',Icon:MapPinned},
 {id:'wallet',label:'Cash & wallet',Icon:Wallet},
] as const;
export default function RiderDashboardShell({children,name,status,approved,activeCount}:{children:React.ReactNode;name:string;status:string;approved:boolean;activeCount:number}){
 const [open,setOpen]=useState(false);
 const [selected,setSelected]=useState('overview');
 function navigate(id:string){setSelected(id);setOpen(false);document.getElementById('rider-'+id)?.scrollIntoView({behavior:'smooth',block:'start'});}
 return <div className="rd-shell">
 <aside className={'rd-sidebar'+(open?' rd-sidebar-open':'')} aria-label="Rider navigation">
  <div className="rd-side-brand"><span className="rd-brand-icon"><Bike size={22}/></span><span><strong>ad<span>panda</span></strong><small>RIDER WORKSPACE</small></span><button className="rd-close" onClick={()=>setOpen(false)} aria-label="Close menu"><X size={20}/></button></div>
  <div className="rd-side-label">WORKSPACE</div>
  <nav className="rd-side-nav">{nav.map(({id,label,Icon})=><button type="button" key={id} onClick={()=>navigate(id)} className={'rd-side-link'+(selected===id?' active':'')}><Icon size={19}/><span>{label}</span>{id==='deliveries'&&activeCount>0&&<span className="rd-side-count">{activeCount}</span>}</button>)}</nav>
  <div className="rd-side-footer"><div className="rd-side-foot-icon"><ShieldCheck size={20}/></div><div><strong>{approved?'Verified rider':'Approval pending'}</strong><small>{approved?'Your account is approved':'Admin approval required'}</small></div></div>
 </aside>
 {open&&<button type="button" className="rd-scrim" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}
 <div className="rd-workspace">
  <header className="rd-topbar"><div className="rd-top-left"><button type="button" className="rd-menu" onClick={()=>setOpen(true)} aria-label="Open rider menu"><Menu size={22}/></button><div><span className="rd-top-eyebrow">DELIVERY PARTNER PORTAL</span><strong>Rider Dashboard</strong></div></div><div className="rd-top-right"><span className={'rd-presence '+status.toLowerCase()}><span className="rd-presence-dot"/>{status}</span><div className="rd-avatar" aria-label={'Signed in as '+name}>{name.trim().slice(0,1).toUpperCase()}</div></div></header>
  <div className="rd-body">{children}</div>
 </div>
 <nav className="rd-mobile-nav" aria-label="Mobile rider navigation">{nav.filter(n=>n.id!=='location').map(({id,label,Icon})=><button type="button" key={id} className={selected===id?'active':''} onClick={()=>navigate(id)}><Icon size={22}/><span>{id==='requests'?'Requests':id==='deliveries'?'Orders':id==='wallet'?'Wallet':'Home'}</span></button>)}</nav>
 </div>;
}
