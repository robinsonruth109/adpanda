import Link from 'next/link';
import {db} from '@/lib/db';
import {Store,MapPin,ArrowRight} from 'lucide-react';
export const dynamic='force-dynamic';
export default async function Kitchens({searchParams}:{searchParams:Promise<{address?:string}>}){
 const {address}=await searchParams;
 const kitchens=await db.kitchen.findMany({where:{active:true,merchant:{status:'APPROVED'}},include:{categories:{where:{active:true},include:{_count:{select:{items:true}}}}},orderBy:{name:'asc'}});
 return <main className="section container live-kitchen-directory">
  <div className="eyebrow">ADPANDA · LOCAL FOOD</div><h1>Explore local kitchens</h1>
  <p className="muted">{address?'Searching near: '+address+'. Select a confirmed delivery pin during checkout.':'Fresh food from verified AdPanda kitchen partners.'}</p>
  <div className="live-kitchen-grid">{kitchens.map(k=><Link key={k.id} className="live-kitchen-card" href={'/kitchens/'+k.slug}><div className="live-kitchen-art"><Store size={47}/>{k.acceptingOrders?<span>Accepting orders</span>:<span className="closed">Closed</span>}</div><div className="live-kitchen-card-body"><div className="flex"><h2>{k.name}</h2><ArrowRight size={20}/></div><p><MapPin size={16}/> {k.address}</p><small>{k.categories.reduce((n,c)=>n+c._count.items,0)} menu items · Cash on delivery</small></div></Link>)}</div>
  {!kitchens.length&&<div className="admin-empty"><Store size={40}/><h3>No approved kitchens yet</h3><p>Once Admin approves a kitchen it will appear here.</p></div>}
 </main>;
}
