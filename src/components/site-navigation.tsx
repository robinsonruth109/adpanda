'use client';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {useState} from 'react';
import {Search,MapPin,ShoppingBag,UserRound,House,Store,Menu,ArrowRight} from 'lucide-react';
type Props={brandName:string;logoId?:string;accountName?:string;accountHref:string};
export default function SiteNavigation({brandName,logoId,accountName,accountHref}:Props){
 const path=usePathname();const router=useRouter();const [search,setSearch]=useState(''),[showMobileSearch,setShowMobileSearch]=useState(false);
 function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();router.push('/kitchens'+(search.trim()?'?q='+encodeURIComponent(search.trim()):''));setShowMobileSearch(false)}
 return <><header className="topbar adp-customer-header"><div className="adp-customer-header-inner">
  <Link href="/" className="adp-customer-logo" aria-label={brandName+' home'}>{logoId?<img src={'/api/media/branding/'+logoId} alt={brandName+' logo'}/>:<span className="adp-customer-default-logo">{brandName.toLowerCase()==='adpanda'?<>ad<span>panda</span></>:brandName}<b>🐼</b></span>}</Link>
  <div className="adp-customer-location"><MapPin size={19}/><div><small>Delivering in</small><strong>Alamdanga, Chuadanga</strong></div></div>
  <form onSubmit={submit} className="adp-customer-top-search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} aria-label="Search kitchens or food" placeholder="Search for kitchens, food and more…"/><button type="submit" aria-label="Search"><ArrowRight size={19}/></button></form>
  <nav className="adp-customer-desktop-nav" aria-label="Customer navigation"><Link href="/kitchens">Explore food</Link><Link href="/orders"><ShoppingBag size={19}/> My orders</Link><Link href={accountHref} className="adp-customer-account"><UserRound size={17}/>{accountName||'Log in'}</Link></nav>
  <button type="button" className="adp-customer-search-toggle" aria-label="Search food" aria-expanded={showMobileSearch} onClick={()=>setShowMobileSearch(s=>!s)}><Search size={22}/></button>
 </div>
 {showMobileSearch&&<form className="adp-customer-mobile-search" onSubmit={submit}><Search size={19}/><input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search food or kitchens" aria-label="Search food or kitchens"/><button type="submit">Search</button></form>}
 </header>
 <nav className="adp-customer-mobile-nav" aria-label="Customer mobile navigation">
  {([{href:'/',label:'Home',Icon:House},{href:'/kitchens',label:'Explore',Icon:Store},{href:'/orders',label:'Orders',Icon:ShoppingBag},{href:accountHref,label:'Account',Icon:UserRound}] as const).map(item=><Link key={item.label} href={item.href} className={path===item.href?'active':''} aria-current={path===item.href?'page':undefined}><item.Icon size={21}/><small>{item.label}</small></Link>)}
 </nav>
 </>;
}
