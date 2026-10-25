import Link from 'next/link';
import {MapPin,ShoppingBag,Store,HeartHandshake,ArrowUpRight} from 'lucide-react';
export default function SiteFooter({brandName,logoId,description,note}:{brandName:string;logoId?:string;description:string;note:string}){
 return <footer className="footer adp-customer-footer"><div className="adp-footer-inner">
  <div className="adp-footer-about"><Link href="/" className="adp-footer-brand">{logoId?<img src={'/api/media/branding/'+logoId} alt={brandName+' logo'}/>:<strong>{brandName.toLowerCase()==='adpanda'?<>ad<span>panda</span></>:brandName} 🐼</strong>}</Link><p>{description}</p><span><MapPin size={17}/> Alamdanga, Chuadanga, Bangladesh</span></div>
  <div className="adp-footer-col"><h3>Explore AdPanda</h3><Link href="/">Home</Link><Link href="/kitchens">Find kitchens</Link><Link href="/orders">My orders</Link><Link href="/login">Your account</Link></div>
  <div className="adp-footer-col"><h3>Work with us</h3><Link href="/merchant/signup">Become a kitchen partner <ArrowUpRight size={14}/></Link><Link href="/merchant/login">Merchant portal</Link><Link href="/rider">Rider portal</Link></div>
  <div className="adp-footer-info"><div><ShoppingBag size={22}/><strong>Local kitchens</strong><small>Delicious food, prepared nearby.</small></div><div><HeartHandshake size={22}/><strong>Cash on delivery</strong><small>Pay when your order arrives.</small></div></div>
 </div><div className="adp-footer-bottom"><span>© {new Date().getFullYear()} {brandName}. All rights reserved.</span><span>{note}</span></div></footer>;
}
