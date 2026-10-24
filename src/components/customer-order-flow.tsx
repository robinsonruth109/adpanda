'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {MapPin,ShoppingBag,Plus,Minus,CheckCircle2} from 'lucide-react';
import KitchenMapPicker from './kitchen-map-picker';

type Food={id:string;name:string;description:string|null;price:number;available:boolean;category:string};
type Props={kitchenId:string;kitchenName:string;items:Food[];acceptingOrders:boolean;customerSignedIn:boolean;deliveryFee:number|null;radiusKm:number|null};
export default function CustomerOrderFlow({kitchenId,kitchenName,items,acceptingOrders,customerSignedIn,deliveryFee,radiusKm}:Props){
 const router=useRouter();
 const [cart,setCart]=useState<Record<string,number>>({}),[checkout,setCheckout]=useState(false),[requestId,setRequestId]=useState('');
 const [latitude,setLatitude]=useState(''),[longitude,setLongitude]=useState(''),[pinConfirmed,setPinConfirmed]=useState(false);
 const [label,setLabel]=useState<'Home'|'Office'|'Other'>('Home'),[details,setDetails]=useState(''),[landmark,setLandmark]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setRequestId(crypto.randomUUID())},[]);
 const lines=items.filter(i=>(cart[i.id]||0)>0);
 const subtotal=useMemo(()=>lines.reduce((sum,item)=>sum+item.price*(cart[item.id]||0),0),[lines,cart]);
 const fee=deliveryFee??0,configured=deliveryFee!==null&&radiusKm!==null;
 const canOrder=acceptingOrders&&configured&&customerSignedIn;
 const count=lines.reduce((s,i)=>s+(cart[i.id]||0),0);
 function change(id:string,delta:number){setError('');setCart(v=>({...v,[id]:Math.max(0,Math.min(20,(v[id]||0)+delta))}))}
 async function place(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;
  if(!pinConfirmed||!latitude||!longitude){setError('Please confirm the exact delivery entrance pin.');return}
  if(!requestId){setError('Please refresh and try again.');return}
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/orders',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId,kitchenId,items:lines.map(i=>({menuItemId:i.id,quantity:cart[i.id]})),address:{label,details:details.trim(),landmark:landmark.trim(),latitude:Number(latitude),longitude:Number(longitude),confirmed:true}})});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||'Could not place order');
   router.push('/orders/'+encodeURIComponent(data.orderId));
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:'Could not place order')}finally{setBusy(false)}
 }
 return <div className="customer-order-flow"><section className="customer-menu"><div className="customer-menu-heading"><h2>Explore the menu</h2><p>Freshly prepared by {kitchenName}</p></div>
  {items.map(food=><article className={'customer-food-row'+(!food.available?' sold-out':'')} key={food.id}><div><span className="customer-food-category">{food.category}</span><h3>{food.name}</h3><p>{food.description||'Made fresh to order'}</p><strong>৳{food.price.toFixed(2)}</strong></div><div className="customer-food-actions">{cart[food.id]>0?<div className="customer-quantity"><button aria-label={'Remove '+food.name} onClick={()=>change(food.id,-1)} type="button"><Minus size={17}/></button><span>{cart[food.id]}</span><button aria-label={'Add '+food.name} onClick={()=>change(food.id,1)} disabled={!food.available} type="button"><Plus size={17}/></button></div>:<button type="button" disabled={!food.available||!acceptingOrders} onClick={()=>change(food.id,1)} className="customer-add-btn">{food.available?'+ Add':'Sold out'}</button>}</div></article>)}
  {!items.length&&<div className="admin-empty">This kitchen has not published any food items yet.</div>}
 </section><aside className="customer-cart"><div className="customer-cart-head"><ShoppingBag size={23}/><div><h2>Your bag</h2><small>{count} items</small></div></div>
  {lines.map(food=><div className="customer-cart-line" key={food.id}><div><strong>{food.name}</strong><small>৳{food.price.toFixed(2)} × {cart[food.id]}</small></div><div className="customer-quantity"><button aria-label={'Remove '+food.name} type="button" onClick={()=>change(food.id,-1)}>−</button><span>{cart[food.id]}</span><button aria-label={'Add '+food.name} type="button" onClick={()=>change(food.id,1)} disabled={!food.available}>+</button></div></div>)}
  {count===0&&<p className="muted">Your bag is empty. Add food to start.</p>}
  <div className="customer-cart-totals"><p><span>Food subtotal</span><strong>৳{subtotal.toFixed(2)}</strong></p><p><span>Delivery fee</span><strong>{configured?'৳'+fee.toFixed(2):'Not configured'}</strong></p><p className="customer-cart-grand"><span>COD total</span><strong>{configured?'৳'+(subtotal+fee).toFixed(2):'—'}</strong></p></div>
  {!customerSignedIn&&<Link href="/login" className="btn customer-checkout-btn">Sign in to place order</Link>}
  {customerSignedIn&&<button className="btn customer-checkout-btn" type="button" disabled={!canOrder||count===0} onClick={()=>setCheckout(true)}>{!acceptingOrders?'Kitchen is closed':!configured?'Delivery settings pending':'Checkout · Cash on delivery'}</button>}
  {configured&&<p className="muted" style={{fontSize:11}}>Delivery available within {radiusKm} km straight-line distance of the kitchen, subject to confirmed entrance pin.</p>}
 </aside>
 {checkout&&<div className="customer-checkout-overlay"><div className="customer-checkout-card"><button type="button" aria-label="Close checkout" className="customer-checkout-close" onClick={()=>setCheckout(false)}>×</button><h2><MapPin size={25}/> Confirm delivery location</h2><p className="muted">Drag the map to mark your building or entrance. Your rider will navigate to this pin.</p>
 <form onSubmit={place}><KitchenMapPicker mode="delivery" latitude={latitude} longitude={longitude} onChange={(a,b)=>{setLatitude(a);setLongitude(b);setPinConfirmed(false)}}/>
  <label className="customer-pin-confirm"><input type="checkbox" checked={pinConfirmed} onChange={e=>setPinConfirmed(e.target.checked)} required/> I have checked my exact delivery entrance pin</label>
  <label className="customer-form-field">Save as<select value={label} onChange={e=>setLabel(e.target.value as 'Home'|'Office'|'Other')}><option>Home</option><option>Office</option><option>Other</option></select></label>
  <label className="customer-form-field">House / Road / Floor / full address<textarea required minLength={8} maxLength={500} value={details} onChange={e=>setDetails(e.target.value)} placeholder="House, road, floor, gate information"/></label>
  <label className="customer-form-field">Nearby landmark (optional)<input maxLength={180} value={landmark} onChange={e=>setLandmark(e.target.value)} placeholder="Nearby shop, market or school"/></label>
  <div className="customer-checkout-summary"><span>Pay cash on delivery</span><strong>৳{(subtotal+fee).toFixed(2)}</strong></div>
  {error&&<p role="alert" className="customer-order-error">{error}</p>}
  <button type="submit" className="btn customer-checkout-btn" disabled={busy||!pinConfirmed}>{busy?'Placing order…':'Confirm COD order'}</button>
 </form></div></div>}
 </div>;
}
