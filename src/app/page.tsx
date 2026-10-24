import Link from 'next/link';
import {db} from '@/lib/db';
import {Store,MapPin,ArrowRight,ShieldCheck} from 'lucide-react';
export const dynamic='force-dynamic';
export default async function Home(){
 const kitchens=await db.kitchen.findMany({where:{active:true,merchant:{status:'APPROVED'}},orderBy:{name:'asc'},take:8});
 return <main>
  <section className="hero adp-hero"><div className="container"><div className="eyebrow">ADPANDA · ALAMDANGA</div><h1>Your favourite local food, delivered with care.</h1><p>Order directly from AdPanda cloud kitchens. Choose your food, pin your exact delivery entrance and pay cash on delivery.</p><Link className="btn" href="/kitchens">Explore kitchens <ArrowRight size={18} style={{verticalAlign:'middle',marginLeft:7}}/></Link><p style={{fontSize:12,marginTop:17}}>Delivery availability and fees are checked at checkout against the kitchen location.</p></div></section>
  <section className="section container live-kitchen-directory"><div className="heading"><h2>Available kitchens</h2><Link href="/kitchens" className="adp-pink-link">See all →</Link></div><div className="live-kitchen-grid">{kitchens.map(k=><Link key={k.id} href={'/kitchens/'+k.slug} className="live-kitchen-card"><div className="live-kitchen-art"><Store size={45}/><span className={k.acceptingOrders?'':'closed'}>{k.acceptingOrders?'Open':'Closed'}</span></div><div className="live-kitchen-card-body"><h3>{k.name}</h3><p><MapPin size={15}/>{k.address}</p><small><ShieldCheck size={14}/> Verified kitchen partner · COD</small></div></Link>)}</div>{!kitchens.length&&<div className="admin-empty"><Store size={38}/><h3>Kitchens are being onboarded</h3><p>New approved kitchens will show here.</p></div>}</section>
  <section className="section container"><div className="panel"><h2>Run a cloud kitchen?</h2><p className="muted">Join AdPanda to reach more local customers with your food.</p><Link href="/merchant" className="btn">Merchant portal</Link></div></section>
 </main>;
}