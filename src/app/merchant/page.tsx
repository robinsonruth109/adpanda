import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import Link from 'next/link';
import MerchantApplication from '@/components/merchant-application';
import MenuManager from '@/components/menu-manager';
export const dynamic='force-dynamic';
export default async function Merchant(){
 const user=await currentUser();
 if(!user)return <main className="section container"><h1>Become an AdPanda merchant</h1><p>Open your cloud kitchen in Alamdanga. Sign in first to apply.</p><div className="links"><Link className="btn" href="/register">Register</Link><Link className="btn secondary" href="/login">Sign in</Link></div></main>;
 const merchants=await db.merchant.findMany({
  where:{members:{some:{userId:user.id}}},
  include:{kitchens:{include:{categories:{include:{items:true}}}}}
 });
 return <main className="section container"><div className="eyebrow">Merchant dashboard</div><h1>Welcome, {user.name}</h1>{merchants.map(m=><section key={m.id} style={{marginBottom:24}}><div className="panel"><h2>{m.name}</h2><p>Status: <strong>{m.status}</strong></p>{m.kitchens.map(k=><div key={k.id}><p>{k.address} · Commission: {k.commissionRate===null?'Default rate':k.commissionRate.toString()+'%'}</p>{m.status==='APPROVED'?<MenuManager kitchenId={k.id} initialItems={k.categories.flatMap(c=>c.items.map(i=>({id:i.id,name:i.name,price:Number(i.price),available:i.available})))}/>:<p className="muted">Your kitchen must be approved before menu management is enabled.</p>}</div>)}</div></section>)}<MerchantApplication/></main>;
}
