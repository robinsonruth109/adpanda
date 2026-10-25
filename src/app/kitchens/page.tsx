import Link from 'next/link';
import {db} from '@/lib/db';
import {kitchenAvailability} from '@/lib/kitchen-hours';
import {Store,MapPin,ArrowRight} from 'lucide-react';
export const dynamic='force-dynamic';
export default async function Kitchens({searchParams}:{searchParams:Promise<{address?:string;q?:string}>}){
 const {address,q:query}=await searchParams;
 const q=(typeof query==='string'?query:'').trim().slice(0,80);
 const kitchens=await db.kitchen.findMany({where:{active:true,merchant:{status:'APPROVED'},...(q?{OR:[{name:{contains:q}},{categories:{some:{active:true,OR:[{name:{contains:q}},{items:{some:{available:true,name:{contains:q}}}}]}}}]}:{})},include:{categories:{where:{active:true},include:{_count:{select:{items:true}}}}},orderBy:{name:'asc'}});
 return <main className="section container live-kitchen-directory">
  <div className="eyebrow">ADPANDA · LOCAL FOOD</div><h1>{q?'Results for “'+q+'”':'Explore local kitchens'}</h1>
  <p className="muted">{address?'Searching near: '+address+'. Select a confirmed delivery pin during checkout.':q?kitchens.length+' matching kitchens and food menus.':'Fresh food from verified AdPanda kitchen partners.'}</p>
  <div className="live-kitchen-grid">{kitchens.map(k=><Link key={k.id} className="live-kitchen-card" href={'/kitchens/'+k.slug}><div className="live-kitchen-art">{k.bannerKey?<img src={"/api/media/kitchens/"+k.id+"/banner?v="+k.bannerVersion} alt={k.name+" banner"} loading="lazy" className="kitchen-directory-cover"/>:<Store size={47}/>}{kitchenAvailability({...k,merchant:{status:"APPROVED"}}).open?<span>Accepting orders</span>:<span className="closed">Closed</span>}</div><div className="live-kitchen-card-body"><div className="flex"><h2>{k.name}</h2><ArrowRight size={20}/></div><p><MapPin size={16}/> {k.address}</p><small>{k.categories.reduce((n,c)=>n+c._count.items,0)} menu items · Cash on delivery</small></div></Link>)}</div>
  {!kitchens.length&&<div className="admin-empty"><Store size={40}/><h3>No approved kitchens yet</h3><p>Once Admin approves a kitchen it will appear here.</p></div>}
 </main>;
}
