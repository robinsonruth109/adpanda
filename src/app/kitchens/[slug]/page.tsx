import {notFound} from 'next/navigation';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
import {deliveryPolicy} from '@/lib/delivery-policy';
import CustomerOrderFlow from '@/components/customer-order-flow';
import {Store,MapPin} from 'lucide-react';
export const dynamic='force-dynamic';
export default async function KitchenPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const [kitchen,policy,user]=await Promise.all([
  db.kitchen.findUnique({where:{slug},include:{merchant:{select:{status:true}},categories:{where:{active:true},orderBy:{sortOrder:'asc'},include:{items:{orderBy:{name:'asc'}}}}}}),
  deliveryPolicy(),currentUser()
 ]);
 if(!kitchen||!kitchen.active||kitchen.merchant.status!=='APPROVED')notFound();
 const items=kitchen.categories.flatMap(c=>c.items.map(item=>({id:item.id,name:item.name,description:item.description,price:Number(item.price),available:item.available,category:c.name,hasImage:Boolean(item.imageKey),imageVersion:item.imageVersion})));
 return <main className="live-kitchen-page container">
  <div className="live-kitchen-banner"><Store size={49}/><span className={kitchen.acceptingOrders?'live-open-pill':'live-closed-pill'}>{kitchen.acceptingOrders?'Open for orders':'Currently closed'}</span></div>
  <div className="live-kitchen-header"><h1>{kitchen.name}</h1><p><MapPin size={17}/>{kitchen.address}</p><p className="muted">{kitchen.description||'Local food prepared fresh'} · Cash on delivery only</p></div>
  <CustomerOrderFlow kitchenId={kitchen.id} kitchenName={kitchen.name} items={items} acceptingOrders={kitchen.acceptingOrders} customerSignedIn={user?.role==='CUSTOMER'} deliveryFee={policy?Number(policy.fee):null} radiusKm={policy?.radius??null}/>
 </main>;
}
