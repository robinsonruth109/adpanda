'use client';
import Link from 'next/link';
import {useState} from 'react';
import {ChevronLeft,ChevronRight,ArrowRight,MapPin,Clock3,ShoppingBag} from 'lucide-react';
type Slide={id:string;title:string|null;subtitle:string|null;ctaLabel:string|null;href:string|null};
export default function HomeHero({slides,eyebrow,title,description,button,href}:{slides:Slide[];eyebrow:string;title:string;description:string;button:string;href:string}){
 const [current,setCurrent]=useState(0);
 const active=slides[current],hasSlides=slides.length>0;
 return <section className={'adp-home-hero'+(hasSlides?' has-slide':'')} aria-label="AdPanda promotions">
  {hasSlides&&<img key={active.id} src={'/api/media/branding/'+active.id} alt={active.title||'AdPanda promotional hero banner'} className="adp-hero-background"/>}
  <div className="adp-hero-overlay"/>
  <div className="adp-home-hero-inner">
   <div className="adp-home-hero-copy"><span className="adp-home-eyebrow"><span/> {eyebrow}</span>
    <h1>{active?.title||title}</h1>
    <p>{active?.subtitle||description}</p>
    <div className="adp-home-hero-actions"><Link href={active?.href||href} className="adp-home-hero-cta">{active?.ctaLabel||button} <ArrowRight size={20}/></Link><span className="adp-hero-subnote"><MapPin size={17}/> Delivering in Alamdanga</span></div>
   </div>
   {!hasSlides&&<div className="adp-home-hero-art" aria-hidden="true"><div className="adp-art-ring"><span>🍔</span></div><div className="adp-art-small a">🍕</div><div className="adp-art-small b">🍜</div><div className="adp-art-small c">🥟</div><span className="adp-art-label">Made fresh, delivered happy!</span></div>}
  </div>
  {slides.length>1&&<div className="adp-home-hero-controls"><button type="button" aria-label="Previous banner" onClick={()=>setCurrent(c=>(c+slides.length-1)%slides.length)}><ChevronLeft size={21}/></button><div className="adp-hero-dots">{slides.map((s,i)=><button key={s.id} type="button" aria-label={'View banner '+(i+1)} aria-current={i===current?'true':undefined} className={i===current?'active':''} onClick={()=>setCurrent(i)}/>)}</div><button type="button" aria-label="Next banner" onClick={()=>setCurrent(c=>(c+1)%slides.length)}><ChevronRight size={21}/></button></div>}
 </section>;
}
export function PromoStrip({slides}:{slides:Slide[]}){
 if(slides.length===0)return null;
 return <section className="adp-promo-section"><div className="adp-home-section-heading"><div><span className="adp-home-overline">MADE FOR YOU</span><h2>Offers & highlights</h2></div></div><div className="adp-promo-scroller">
 {slides.map(s=><Link key={s.id} href={s.href||'/kitchens'} className="adp-promo-card"><img src={'/api/media/branding/'+s.id} alt={s.title||'AdPanda offer'}/><span className="adp-promo-shade"/><div><strong>{s.title||'Discover something delicious'}</strong><small>{s.subtitle}</small><span>{s.ctaLabel||'Explore now'} <ArrowRight size={17}/></span></div></Link>)}
 </div></section>;
}
