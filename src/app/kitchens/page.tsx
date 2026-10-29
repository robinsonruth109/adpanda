import Link from 'next/link';
import type {Prisma} from '@prisma/client';
import {db} from '@/lib/db';
import {kitchenAvailability} from '@/lib/kitchen-hours';
import {storeTypeContent,isMarketplaceType,storeTypes,type MarketplaceType} from '@/lib/store-types';
import {Store,MapPin,ArrowRight} from 'lucide-react';
export const dynamic='force-dynamic';
export default async function Stores({searchParams}:{searchParams:Promise<{address?:string;q?:string;type?:string}>}){
 const {address,q:query,type}=await searchParams;
 const q=(typeof query==='string'?query:'').trim().slice(0,80);
 const selected:MarketplaceType|null=typeof type==='string'&&isMarketplaceType(type)?type:null;
 const where:Prisma.KitchenWhereInput={
  active:true,merchant:{status:'APPROVED'},
  ...(selected?{storeType:selected}:{}),
  ...(q?{OR:[{name:{contains:q}},{categories:{some:{active:true,OR:[{name:{contains:q}},{items:{some:{available:true,name:{contains:q}}}}]}}}]}:{})
 };
 const stores=await db.kitchen.findMany({where,include:{categories:{where:{active:true},include:{_count:{select:{items:true}}}}},orderBy:{name:'asc'}});
 const label=selected?storeTypeContent[selected].name:'All stores';
 const findHref=(t:MarketplaceType|null)=>'/kitchens'+((t||q)?'?'+new URLSearchParams({...t?{type:t}:{},...q?{q}:{}}).toString():'');
 return <main className="section container live-kitchen-directory adp-multi-store-directory">
  <div className="eyebrow">ADPANDA MARKETPLACE · আলমডাঙ্গা</div><h1>{q?'Results for “'+q+'”':selected?label+' near you':'খাবার, মুদি বাজার ও স্টেশনারি'}</h1>
  <p className="muted">{address?'Searching near: '+address+'. Confirm exact delivery pin at checkout.':q?stores.length+'টি matching store পাওয়া গেছে।':'Food delivery থেকে নিত্যপ্রয়োজনীয় বাজার ও খাতা-কলম—সব একটি platform-এ।'}</p>
  <nav className="adp-store-type-tabs" aria-label="Browse by shop type">
   <Link className={!selected?'active':''} href={findHref(null)} aria-current={!selected?'page':undefined}>🏪 All shops</Link>
   {storeTypes.map(t=><Link key={t} className={selected===t?'active':''} aria-current={selected===t?'page':undefined} href={findHref(t)}>{storeTypeContent[t].emoji} {storeTypeContent[t].name}</Link>)}
  </nav>
  <div className="live-kitchen-grid">{stores.map(s=>{
   const kind=storeTypeContent[s.storeType],isOpen=kitchenAvailability({...s,merchant:{status:'APPROVED'}}).open;
   return <Link key={s.id} className="live-kitchen-card" href={'/kitchens/'+s.slug}>
    <div className="live-kitchen-art">{s.bannerKey?<img src={'/api/media/kitchens/'+s.id+'/banner?v='+s.bannerVersion} alt={s.name+' cover'} loading="lazy" className="kitchen-directory-cover"/>:<span className="adp-directory-fallback-icon">{kind.emoji}</span>}
     <span className={'adp-directory-vertical-pill '+(isOpen?'':'closed')}>{kind.name}</span>
    </div>
    <div className="live-kitchen-card-body"><div className="flex"><h2>{s.name}</h2><ArrowRight size={20}/></div><p><MapPin size={16}/> {s.address}</p><small>{s.categories.reduce((n,c)=>n+c._count.items,0)} products · {isOpen?'🟢 Open':'🔴 Closed'} · Cash on delivery</small></div>
   </Link>
  })}</div>
  {!stores.length&&<div className="admin-empty"><Store size={40}/><h3>{selected?'এই ক্যাটাগরিতে এখনও approved shop নেই':'No stores found yet'}</h3><p>Admin নতুন দোকান approve করলে এখানে দেখা যাবে।</p><Link className="btn" href="/merchant/signup">Register your shop</Link></div>}
 </main>;
}
