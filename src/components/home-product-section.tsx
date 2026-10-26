import Link from 'next/link';
import {ArrowRight,Store,ShoppingBag} from 'lucide-react';
import type {MarketplaceType} from '@/lib/store-types';

export type HomepageProduct={
 id:string;
 name:string;
 price:number;
 unitLabel:string;
 category:string;
 storeName:string;
 storeSlug:string;
 hasImage:boolean;
 imageVersion:number;
 storeOpen:boolean;
};

const verticals:Record<MarketplaceType,{
 eyebrow:string;title:string;description:string;emoji:string;empty:string;linkLabel:string;cardLabel:string
}>={
 FOOD:{
  eyebrow:'FRESHLY PREPARED · খাবার',
  title:'Popular food near you',
  description:'মজাদার খাবার, স্থানীয় কিচেন থেকে আপনার দরজায়।',
  emoji:'🍔',empty:'নতুন খাবার যোগ হলে এখানে দেখা যাবে।',
  linkLabel:'See all food',cardLabel:'View menu'
 },
 GROCERY:{
  eyebrow:'EVERYDAY ESSENTIALS · মুদি বাজার',
  title:'Daily grocery essentials',
  description:'চাল, ডাল, তেল ও নিত্যপ্রয়োজনীয় বাজার — স্থানীয় দোকান থেকে।',
  emoji:'🛒',empty:'মুদি দোকান নতুন পণ্য প্রকাশ করলে এখানে দেখা যাবে।',
  linkLabel:'Shop groceries',cardLabel:'View product'
 },
 STATIONERY:{
  eyebrow:'SCHOOL & OFFICE · স্টেশনারি',
  title:'Stationery & study items',
  description:'খাতা, কলম, বই ও অফিসের প্রয়োজনীয় জিনিস এক জায়গায়।',
  emoji:'✏️',empty:'স্টেশনারি দোকান নতুন পণ্য প্রকাশ করলে এখানে দেখা যাবে।',
  linkLabel:'Browse stationery',cardLabel:'View product'
 }
};

export default function HomeProductSection({type,items}:{
 type:MarketplaceType;items:HomepageProduct[];
}){
 const details=verticals[type];
 const browseUrl='/kitchens?type='+type;
 return <section className={'adp-home-product-section adp-home-products-'+type.toLowerCase()} aria-label={details.title}>
  <div className="adp-home-section-heading">
   <div>
    <span className="adp-home-overline">{details.eyebrow}</span>
    <h2>{details.title}</h2>
    <p>{details.description}</p>
   </div>
   <Link href={browseUrl} className="adp-home-see-all">{details.linkLabel}<ArrowRight size={18}/></Link>
  </div>
  {items.length>0
   ?<div className="adp-home-food-grid adp-home-vertical-product-grid">
    {items.map(item=><Link key={item.id} className="adp-home-food-card adp-home-vertical-product-card"
     href={'/kitchens/'+item.storeSlug}
     aria-label={item.name+' from '+item.storeName+', '+item.price+' taka per '+item.unitLabel}>
      <div className="adp-home-food-image">
       {item.hasImage
        ?<img src={'/api/media/menu/'+encodeURIComponent(item.id)+'?v='+item.imageVersion} alt={item.name} loading="lazy"/>
        :<span className="adp-product-fallback" aria-hidden="true">{details.emoji}</span>}
       <span className={'adp-home-product-availability '+(item.storeOpen?'open':'closed')}>
        {item.storeOpen?'Open now':'Shop closed'}
       </span>
      </div>
      <div className="adp-home-food-card-info">
       <span className="adp-home-food-category">{item.category}</span>
       <h3>{item.name}</h3>
       <p className="adp-home-product-shop"><Store size={13}/>{item.storeName}</p>
       <div className="adp-home-product-price-row">
        <span className="adp-home-product-price"><strong>৳{item.price.toFixed(2)}</strong><small>/ {item.unitLabel}</small></span>
        <span className="adp-home-product-action">{details.cardLabel}<ArrowRight size={15}/></span>
       </div>
      </div>
     </Link>)}
    </div>
   :<div className="adp-home-product-empty">
     <span aria-hidden="true">{details.emoji}</span>
     <div><h3>{details.title} — coming soon</h3><p>{details.empty}</p></div>
     <Link href={browseUrl}>Browse {type==='FOOD'?'food shops':type==='GROCERY'?'grocery shops':'stationery shops'}<ArrowRight size={17}/></Link>
    </div>}
 </section>;
}
