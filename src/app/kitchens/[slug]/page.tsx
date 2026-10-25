import {notFound} from 'next/navigation';
import {db} from '@/lib/db';
import {deliveryPolicy} from '@/lib/delivery-policy';
import CustomerOrderFlow from '@/components/customer-order-flow';
import {Store,MapPin} from 'lucide-react';
import {kitchenAvailability} from '@/lib/kitchen-hours';
import {storeTypeContent} from '@/lib/store-types';
export const dynamic='force-dynamic';
export default async function KitchenPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const [kitchen,policy]=await Promise.all([
  db.kitchen.findUnique({where:{slug},include:{merchant:{select:{status:true}},categories:{where:{active:true},orderBy:{sortOrder:'asc'},include:{items:{orderBy:{name:'asc'}}}}}}),
  deliveryPolicy()
 ]);
 if(!kitchen||!kitchen.active||kitchen.merchant.status!=='APPROVED')notFound();
 const availability=kitchenAvailability(kitchen);
 const type=storeTypeContent[kitchen.storeType];
 const items=kitchen.categories.flatMap(c=>c.items.map(item=>({id:item.id,name:item.name,description:item.description,price:Number(item.price),available:item.available&&(item.stockQty===null||item.stockQty>0),unitLabel:item.unitLabel,stockQty:item.stockQty,category:c.name,hasImage:Boolean(item.imageKey),imageVersion:item.imageVersion})));
 return <main className="live-kitchen-page container">
  <div className="live-kitchen-banner">{kitchen.bannerKey?<img className="kitchen-banner-photo" src={"/api/media/kitchens/"+kitchen.id+"/banner?v="+kitchen.bannerVersion} alt={kitchen.name+" cover photo"}/>:<Store size={49}/>}<span className={availability.open?'live-open-pill':'live-closed-pill'}>{availability.open?'Open for orders':'Currently closed'}</span></div>
  <div className="live-kitchen-header"><span className="adp-store-detail-type">{type.emoji} {type.name} · {type.bn}</span><h1>{kitchen.name}</h1><p><MapPin size={17}/>{kitchen.address}</p><p className="muted">{kitchen.description||type.tagline} · Cash on delivery only</p><p className="muted">{availability.reason} · Hours use Bangladesh time (Asia/Dhaka)</p></div>
  <CustomerOrderFlow storeType={kitchen.storeType} kitchenId={kitchen.id} kitchenName={kitchen.name} items={items} acceptingOrders={availability.open} deliveryFee={policy?Number(policy.fee):null} radiusKm={policy?.radius??null}/>
 </main>;
}
