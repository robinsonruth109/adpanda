'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {MapPin,Store,ExternalLink,ShieldCheck} from 'lucide-react';
import MerchantKitchenHours from '@/components/merchant-kitchen-hours';
import MerchantKitchenBanner from '@/components/merchant-kitchen-banner';
import {storeTypeContent,type MarketplaceType} from '@/lib/store-types';
type Kitchen={id:string;name:string;storeType:MarketplaceType;slug:string;description:string;address:string;latitude:string;longitude:string;commission:string;approved:boolean;open:boolean;mode:string;hours:unknown;hasBanner:boolean;bannerVersion:number};
export default function MerchantStoreSettings({kitchens}:{kitchens:Kitchen[]}){
 const router=useRouter();const [descriptions,setDescriptions]=useState<Record<string,string>>({}),[busy,setBusy]=useState<string|null>(null),[notice,setNotice]=useState('');
 async function save(k:Kitchen){
  if(busy)return;setBusy(k.id);setNotice('');
  try{const r=await fetch('/api/merchant/kitchens/'+encodeURIComponent(k.id)+'/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({description:descriptions[k.id]??k.description})});const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to save settings');setNotice('Kitchen description updated.');router.refresh()}catch(e){setNotice(e instanceof Error?e.message:'Unable to save')}finally{setBusy(null)}
 }
 return <div className="merchant-settings-list">
 {notice&&<p className="merchant-inline-alert" role="status">{notice}</p>}
 {kitchens.map(k=><article className="merchant-settings-card" key={k.id}>
 <header><span className="merchant-settings-symbol"><Store size={23}/></span><div><h2>{k.name}</h2><span className={'merchant-status-chip '+(k.approved?'approved':'pending')}>{k.approved?'Approved':'Pending approval'}</span></div><Link href={'/kitchens/'+k.slug} target="_blank" rel="noopener noreferrer">Customer page <ExternalLink size={15}/></Link></header>
 <div className="merchant-settings-section"><h3>{storeTypeContent[k.storeType].emoji} Shop banner</h3><p>Upload a cover photo for your {storeTypeContent[k.storeType].singular.toLowerCase()} storefront.</p><MerchantKitchenBanner kitchenId={k.id} version={k.bannerVersion} hasBanner={k.hasBanner} approved={k.approved}/></div>
 <div className="merchant-settings-section"><h3>Business hours & order availability</h3><p>Weekly opening and closing schedule, day off, and manual open or close controls.</p><MerchantKitchenHours id={k.id} approved={k.approved} effectiveOpen={k.open} mode={k.mode} hours={k.hours}/></div>
 <div className="merchant-settings-section"><h3>Storefront description</h3><p>Tell customers what your shop offers and why they should choose you.</p><label>Shop description<textarea rows={4} maxLength={2000} value={descriptions[k.id]??k.description} onChange={e=>setDescriptions(v=>({...v,[k.id]:e.target.value}))} placeholder="Describe your food, grocery or stationery offerings"/></label><button type="button" className="merchant-primary-button" disabled={!k.approved||busy===k.id} onClick={()=>save(k)}>{busy===k.id?'Saving…':'Save description'}</button></div>
 <div className="merchant-settings-section"><h3><MapPin size={19}/> Verified pickup location</h3><p>{k.address}</p><p className="merchant-settings-coordinates">{k.latitude}, {k.longitude}</p><a target="_blank" rel="noopener noreferrer" href={'https://www.google.com/maps?q='+k.latitude+','+k.longitude}>Verify pin in Google Maps <ExternalLink size={15}/></a><div className="merchant-settings-warning"><ShieldCheck size={18}/> Shop pickup coordinates are protected after approval. Contact Admin to request a verified location change.</div></div>
 <div className="merchant-settings-section"><h3>Commission</h3><p>Your AdPanda platform commission rate: <strong>{k.commission}</strong>. Only Admin can change commission settings.</p></div>
 </article>)}
 {!kitchens.length&&<div className="merchant-empty-state"><Store size={36}/><h3>No store found</h3><p>Apply for shop approval to manage store settings.</p></div>}
 </div>;
}
