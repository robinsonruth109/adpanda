import {db} from '@/lib/db';
import MerchantReviews from '@/components/merchant-reviews';
import {adminMerchantOverview} from '@/lib/admin-merchant-overview';
import {storeTypeContent,storeTypes} from '@/lib/store-types';
import {Store,UserRoundCheck,ClipboardList,ShieldBan} from 'lucide-react';
export const dynamic='force-dynamic';

export default async function Page(){
 const [merchants,data]=await Promise.all([
  db.merchant.groupBy({by:['status'],_count:{_all:true}}),
  adminMerchantOverview()
 ]);
 const count=(status:string)=>merchants.find(m=>m.status===status)?._count._all||0;
 const total=merchants.reduce((sum,m)=>sum+m._count._all,0);
 const cards=[
  {label:'Total merchants',value:total,icon:Store,kind:'pink',detail:'Registered business partners'},
  {label:'Pending approvals',value:count('PENDING'),icon:ClipboardList,kind:'orange',detail:'Applications waiting for review'},
  {label:'Approved merchants',value:count('APPROVED'),icon:UserRoundCheck,kind:'green',detail:'Verified business accounts'},
  {label:'Suspended merchants',value:count('SUSPENDED'),icon:ShieldBan,kind:'red',detail:'Suspended business accounts'}
 ];
 return <section className="admin-merchants-screen">
  <div className="admin-breadcrumb">Partners / <strong>Merchant management</strong></div>
  <div className="admin-section-heading adp-merchant-page-heading">
   <div><span className="admin-overline">PARTNER NETWORK</span><h1>Merchant management</h1>
    <p>Manage each shop by business type, verify pickup pins, track results and update commission separately.</p></div>
  </div>
  <div className="adp-merchant-overview-grid">{cards.map(c=><article key={c.label} className={'adp-merchant-overview-card '+c.kind}>
   <div className="adp-merchant-overview-icon"><c.icon size={19}/></div>
   <small>{c.label}</small><strong>{c.value}</strong><span>{c.detail}</span>
  </article>)}</div>
  <div className="adp-merchant-network-strip">{storeTypes.map(type=>{
   const stores=data.reduce((n,m)=>n+m.kitchens.filter(k=>k.storeType===type).length,0);
   return <div key={type}><span>{storeTypeContent[type].emoji}</span><div><strong>{storeTypeContent[type].name}</strong><small>{stores} {stores===1?'shop':'shops'} registered</small></div></div>
  })}</div>
  <MerchantReviews merchants={data}/>
 </section>;
}
