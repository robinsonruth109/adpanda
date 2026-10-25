'use client';
import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {MapPin,ShoppingBag,Plus,Minus,CheckCircle2,UtensilsCrossed,Phone,UserRound,House,ShieldCheck,ArrowLeft,Navigation} from 'lucide-react';
import KitchenMapPicker from './kitchen-map-picker';

type Food={id:string;name:string;description:string|null;price:number;available:boolean;category:string;hasImage:boolean;imageVersion:number};
type Props={kitchenId:string;kitchenName:string;items:Food[];acceptingOrders:boolean;deliveryFee:number|null;radiusKm:number|null};
export default function CustomerOrderFlow({kitchenId,kitchenName,items,acceptingOrders,deliveryFee,radiusKm}:Props){
 const router=useRouter();
 const [cart,setCart]=useState<Record<string,number>>({}),[checkout,setCheckout]=useState(false),[requestId,setRequestId]=useState('');
 const [latitude,setLatitude]=useState(''),[longitude,setLongitude]=useState(''),[pinConfirmed,setPinConfirmed]=useState(false);
 const [label,setLabel]=useState<'Home'|'Office'|'Other'>('Home'),[details,setDetails]=useState(''),[landmark,setLandmark]=useState('');
 const [recipientName,setRecipientName]=useState(''),[recipientPhone,setRecipientPhone]=useState(''),[guestAccess,setGuestAccess]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setRequestId(crypto.randomUUID());setGuestAccess(Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join(''))},[]);
 const lines=items.filter(i=>(cart[i.id]||0)>0);
 const subtotal=useMemo(()=>lines.reduce((sum,item)=>sum+item.price*(cart[item.id]||0),0),[lines,cart]);
 const fee=deliveryFee??0,configured=deliveryFee!==null&&radiusKm!==null;
 const canOrder=acceptingOrders&&configured;
 const count=lines.reduce((s,i)=>s+(cart[i.id]||0),0);
 function change(id:string,delta:number){setError('');setCart(v=>({...v,[id]:Math.max(0,Math.min(20,(v[id]||0)+delta))}))}
 async function place(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;
  if(!pinConfirmed||!latitude||!longitude){setError('📍 ডেলিভারি লোকেশন pin করে Confirm করুন।');return}
  if(!recipientName.trim()||recipientName.trim().length<2){setError('আপনার পূর্ণ নাম লিখুন।');return}
  if(!/^01[3-9]\d{8}$/.test(recipientPhone)){setError('সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন।');return}
  if(details.trim().length<8){setError('বাসা / রাস্তা / এলাকার বিস্তারিত ঠিকানা লিখুন।');return}
  if(!requestId||!guestAccess){setError('পৃষ্ঠা Refresh করে আবার চেষ্টা করুন।');return}
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/orders',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId,guestAccess,recipientName:recipientName.trim(),recipientPhone,kitchenId,items:lines.map(i=>({menuItemId:i.id,quantity:cart[i.id]})),address:{label,details:details.trim(),landmark:landmark.trim(),latitude:Number(latitude),longitude:Number(longitude),confirmed:true}})});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||'Could not place order');
   router.push('/orders/'+encodeURIComponent(data.orderId)+(data.guestAccess?'?access='+encodeURIComponent(data.guestAccess):''));
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:'Could not place order')}finally{setBusy(false)}
 }
 return <div className="customer-order-flow"><section className="customer-menu"><div className="customer-menu-heading"><h2>Explore the menu</h2><p>Freshly prepared by {kitchenName}</p></div>
  {items.map(food=><article className={'customer-food-row'+(!food.available?' sold-out':'')} key={food.id}><div className="customer-food-photo">{food.hasImage?<img src={'/api/media/menu/'+encodeURIComponent(food.id)+'?v='+food.imageVersion} alt={food.name} loading="lazy"/>:<UtensilsCrossed size={28}/>}</div><div className="customer-food-details"><span className="customer-food-category">{food.category}</span><h3>{food.name}</h3><p>{food.description||'Made fresh to order'}</p><strong>৳{food.price.toFixed(2)}</strong></div><div className="customer-food-actions">{cart[food.id]>0?<div className="customer-quantity"><button aria-label={'Remove '+food.name} onClick={()=>change(food.id,-1)} type="button"><Minus size={17}/></button><span>{cart[food.id]}</span><button aria-label={'Add '+food.name} onClick={()=>change(food.id,1)} disabled={!food.available} type="button"><Plus size={17}/></button></div>:<button type="button" disabled={!food.available||!acceptingOrders} onClick={()=>change(food.id,1)} className="customer-add-btn">{food.available?'+ Add':'Sold out'}</button>}</div></article>)}
  {!items.length&&<div className="admin-empty">This kitchen has not published any food items yet.</div>}
 </section><aside className="customer-cart"><div className="customer-cart-head"><ShoppingBag size={23}/><div><h2>Your bag</h2><small>{count} items</small></div></div>
  {lines.map(food=><div className="customer-cart-line" key={food.id}><div><strong>{food.name}</strong><small>৳{food.price.toFixed(2)} × {cart[food.id]}</small></div><div className="customer-quantity"><button aria-label={'Remove '+food.name} type="button" onClick={()=>change(food.id,-1)}>−</button><span>{cart[food.id]}</span><button aria-label={'Add '+food.name} type="button" onClick={()=>change(food.id,1)} disabled={!food.available}>+</button></div></div>)}
  {count===0&&<p className="muted">Your bag is empty. Add food to start.</p>}
  <div className="customer-cart-totals"><p><span>Food subtotal</span><strong>৳{subtotal.toFixed(2)}</strong></p><p><span>Delivery fee</span><strong>{configured?'৳'+fee.toFixed(2):'Not configured'}</strong></p><p className="customer-cart-grand"><span>COD total</span><strong>{configured?'৳'+(subtotal+fee).toFixed(2):'—'}</strong></p></div>
  <button className="btn customer-checkout-btn" type="button" disabled={!canOrder||count===0} onClick={()=>{setError('');setCheckout(true)}}>{!acceptingOrders?'Kitchen বন্ধ আছে':!configured?'Delivery setup pending':'চেকআউট করুন · Cash on Delivery'}</button>
  <p className="customer-guest-note"><ShieldCheck size={14}/> Login ছাড়াই অর্ডার করুন — COD Only</p>
  {configured&&<p className="muted" style={{fontSize:11}}>Delivery available within {radiusKm} km straight-line distance of the kitchen, subject to confirmed entrance pin.</p>}
 </aside>

 {checkout&&<div className="customer-checkout-overlay" role="presentation"><div className="customer-checkout-card customer-guest-checkout" role="dialog" aria-modal="true" aria-label="Guest checkout and delivery address">
  <div className="customer-guest-checkout-header"><div><span>ADPANDA · SECURE COD CHECKOUT</span><h2>অর্ডার কনফার্ম করুন</h2><p>Login লাগবে না। সঠিক নাম, ফোন ও লোকেশন দিন যাতে Rider সহজে পৌঁছাতে পারে।</p></div><button type="button" aria-label="Close checkout" className="customer-checkout-close" onClick={()=>setCheckout(false)}>×</button></div>
 <form onSubmit={place}>
  <div className="customer-guest-checkout-section"><div className="customer-guest-section-heading"><span><UserRound size={19}/></span><div><h3>1. আপনার তথ্য (Contact Details)</h3><p>Rider এই নম্বরে ফোন করে ডেলিভারি নিশ্চিত করতে পারবে।</p></div></div>
  <div className="customer-guest-input-grid"><label className="customer-form-field"><span>আপনার নাম (Full Name) <b>*</b></span><input type="text" autoComplete="name" minLength={2} maxLength={100} required value={recipientName} onChange={e=>setRecipientName(e.target.value)} placeholder="যেমন: Abdullah Sabbir"/></label>
  <label className="customer-form-field"><span>মোবাইল নম্বর (11 Digits) <b>*</b></span><input type="tel" inputMode="numeric" autoComplete="tel-national" pattern="01[3-9][0-9]{8}" maxLength={11} required value={recipientPhone} onChange={e=>setRecipientPhone(e.target.value.replace(/\D/g,'').slice(0,11))} placeholder="01XXXXXXXXX"/></label></div></div>
  <div className="customer-guest-checkout-section"><div className="customer-guest-section-heading"><span><Navigation size={19}/></span><div><h3>2. Delivery Pin / লোকেশন</h3><p>ম্যাপে ডেলিভারি জায়গা বা বাসার গেট ঠিকমতো Pin করুন।</p></div></div>
   <div className="customer-guest-map-wrap"><KitchenMapPicker mode="delivery" latitude={latitude} longitude={longitude} onChange={(a,b)=>{setLatitude(a);setLongitude(b);setPinConfirmed(false)}}/></div>
   <label className="customer-pin-confirm"><input type="checkbox" checked={pinConfirmed} onChange={e=>setPinConfirmed(e.target.checked)} required disabled={!latitude||!longitude}/> <span>আমি ঠিক জায়গায় Pin দিয়েছি — Rider এই লোকেশনে খাবার পৌঁছাবে।</span></label>
  </div>
  <div className="customer-guest-checkout-section"><div className="customer-guest-section-heading"><span><House size={19}/></span><div><h3>3. সম্পূর্ণ ঠিকানা (Address Details)</h3><p>ম্যাপের Pin-এর পাশাপাশি বাড়ির তথ্য দিন।</p></div></div>
   <div className="customer-guest-input-grid"><label className="customer-form-field"><span>ঠিকানার ধরন (Address Type)</span><select value={label} onChange={e=>setLabel(e.target.value as 'Home'|'Office'|'Other')}><option value="Home">🏠 বাসা / Home</option><option value="Office">🏢 অফিস / Office</option><option value="Other">📍 অন্যান্য / Other</option></select></label></div>
   <label className="customer-form-field"><span>বাসা/বিল্ডিং, রোড, ফ্লোর, এলাকা <b>*</b></span><textarea required minLength={8} maxLength={500} rows={3} value={details} onChange={e=>setDetails(e.target.value)} placeholder="যেমন: London Tower-এর পাশে, ২য় তলা, আলিফউদ্দিন রোড, আলমডাঙ্গা"/></label>
   <label className="customer-form-field"><span>কাছের পরিচিত জায়গা (Landmark) — Optional</span><input maxLength={180} value={landmark} onChange={e=>setLandmark(e.target.value)} placeholder="যেমন: বাজার মসজিদ / স্কুলের সামনে / বড় দোকানের পাশ"/></label>
  </div>
  <div className="customer-guest-checkout-bottom"><div className="customer-guest-total"><span>খাবার ৳{subtotal.toFixed(2)} + ডেলিভারি ৳{fee.toFixed(2)}</span><div><strong>মোট Cash on Delivery</strong><b>৳{(subtotal+fee).toFixed(2)}</b></div></div>
   {error&&<p role="alert" className="customer-order-error">{error}</p>}
   <button type="submit" className="btn customer-checkout-btn" disabled={busy||!pinConfirmed||!recipientName.trim()||!/^01[3-9]\d{8}$/.test(recipientPhone)||details.trim().length<8}>{busy?'অর্ডার নেওয়া হচ্ছে…':'অর্ডার কনফার্ম করুন · COD'}</button>
   <p className="customer-guest-checkout-footnote"><ShieldCheck size={14}/> কোনো অগ্রিম Payment নেই। Rider-এর হাতে Cash পরিশোধ করুন।</p>
  </div>
 </form></div></div>}
 </div>;
}
