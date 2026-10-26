import Link from 'next/link';
import {db} from '@/lib/db';
import {getBranding,getPublicBrandAssets} from '@/lib/site-branding';
import {kitchenAvailability} from '@/lib/kitchen-hours';
import HomeHero,{PromoStrip} from '@/components/home-hero';
import {storeTypes,storeTypeContent} from '@/lib/store-types';
import HomeProductSection from '@/components/home-product-section';
import {Store,MapPin,ArrowRight,ShieldCheck,UtensilsCrossed,Clock3,ShoppingBag,ChefHat,HandCoins} from 'lucide-react';
export const dynamic='force-dynamic';
export default async function Home(){
 const [branding,assets,kitchens,productGroups]=await Promise.all([
  getBranding(),
  getPublicBrandAssets(),
  db.kitchen.findMany({where:{active:true,merchant:{status:'APPROVED'}},orderBy:{name:'asc'},take:12}),
  Promise.all(storeTypes.map(async type=>({
   type,
   items:await db.menuItem.findMany({
    where:{
     available:true,
     OR:[{stockQty:null},{stockQty:{gt:0}}],
     category:{active:true,kitchen:{active:true,storeType:type,merchant:{status:'APPROVED'}}}
    },
    select:{
     id:true,name:true,price:true,unitLabel:true,imageKey:true,imageVersion:true,
     category:{select:{
      name:true,
      kitchen:{select:{name:true,slug:true,storeType:true,active:true,acceptingOrders:true,availabilityMode:true,weeklyHours:true,groceryReviewedDate:true}}
     }}
    },
    orderBy:{name:'asc'},
    take:10
   })
  })))
 ]);
 const hero=assets.filter(a=>a.kind==='HERO');
 const promos=assets.filter(a=>a.kind==='PROMO');
 const productSections=productGroups.map(group=>({
  type:group.type,
  items:group.items.map(item=>({
   id:item.id,
   name:item.name,
   price:Number(item.price),
   unitLabel:item.unitLabel,
   category:item.category.name,
   storeName:item.category.kitchen.name,
   storeSlug:item.category.kitchen.slug,
   hasImage:Boolean(item.imageKey),
   imageVersion:item.imageVersion,
   storeOpen:kitchenAvailability({...item.category.kitchen,merchant:{status:'APPROVED'}}).open
  }))
 }));
 return <main className="adp-home-main">
  <HomeHero slides={hero} eyebrow={branding.homeEyebrow} title={branding.headline} description={branding.description} button={branding.heroButton} href={branding.heroLink}/>
  <div className="adp-home-inner">
   <section className="adp-home-discovery" aria-label="Why order with AdPanda"><div><span><MapPin size={23}/></span><p><strong>Discover nearby</strong><small>Local Alamdanga favourites</small></p></div><div><span><UtensilsCrossed size={23}/></span><p><strong>Freshly prepared</strong><small>Food made when you order</small></p></div><div><span><HandCoins size={23}/></span><p><strong>Cash on delivery</strong><small>Pay at your doorstep</small></p></div></section>
   <section className="adp-home-verticals" aria-label="Shop by category">
    <div className="adp-home-section-heading"><div><span className="adp-home-overline">WHAT DO YOU NEED TODAY?</span><h2>Shop food, groceries & stationery</h2><p>খাবার, বাজার আর খাতা-কলম — সবকিছু এক জায়গায়।</p></div></div>
    <div className="adp-home-vertical-grid">{storeTypes.map(t=><Link key={t} href={'/kitchens?type='+t} className={'adp-home-vertical '+t.toLowerCase()}>
     <span className="adp-home-vertical-emoji">{storeTypeContent[t].emoji}</span><div><small>{storeTypeContent[t].bn}</small><h3>{storeTypeContent[t].name}</h3><p>{storeTypeContent[t].tagline}</p><span>Explore shops <ArrowRight size={16}/></span></div></Link>)}</div>
   </section>
   <section className="adp-home-kitchen-section"><div className="adp-home-section-heading"><div><span className="adp-home-overline">NEIGHBOURHOOD STORES NEAR YOU</span><h2>{branding.kitchensTitle}</h2><p>Verified restaurants, grocery shops and stationery stores near you.</p></div><Link href="/kitchens" className="adp-home-see-all">See all shops <ArrowRight size={18}/></Link></div>
    {kitchens.length>0?<div className="adp-home-kitchen-grid">{kitchens.map(k=>{
     const status=kitchenAvailability({...k,merchant:{status:'APPROVED'}});
     return <Link href={'/kitchens/'+k.slug} key={k.id} className="adp-home-kitchen-card"><div className="adp-home-kitchen-image">{k.bannerKey?<img src={'/api/media/kitchens/'+k.id+'/banner?v='+k.bannerVersion} alt={k.name+' cover'} loading="lazy"/>:<span className="adp-home-kitchen-fallback">{storeTypeContent[k.storeType].emoji}</span>}<span className={'adp-home-status '+(status.open?'is-open':'is-closed')}>{status.open?'● Open now':'● Closed'}</span></div><div className="adp-home-kitchen-info"><h3>{k.name}</h3><p><MapPin size={15}/>{k.address}</p><div><span><ShieldCheck size={15}/> Verified {storeTypeContent[k.storeType].singular}</span><span>Cash on delivery</span></div></div></Link>
    })}</div>:<div className="adp-home-empty"><Store size={34}/><h3>More local shops are on the way</h3><p>Our verified food, grocery and stationery partners will appear here.</p></div>}
   </section>
   {productSections.map(section=><HomeProductSection key={section.type} type={section.type} items={section.items}/>)}
   <PromoStrip slides={promos}/>
   <section className="adp-home-merchant-cta"><div><span className="adp-home-overline">GROW YOUR BUSINESS WITH US</span><h2>{branding.merchantHeadline}</h2><p>{branding.merchantDescription}</p><Link href="/merchant/signup">Become a partner <ArrowRight size={18}/></Link></div><div className="adp-home-partner-art" aria-hidden="true"><span>👩‍🍳</span><span>🍱</span></div></section>
  </div>
 </main>;
}
