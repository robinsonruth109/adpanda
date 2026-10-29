'use client';
import {useEffect,useMemo,useState} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import MerchantDispatchProof from '@/components/merchant-dispatch-proof';
import MerchantPaymentReview from '@/components/merchant-payment-review';
import MerchantReturnReview from '@/components/merchant-return-review';
import {Search,RefreshCcw,Clock3,CheckCheck,ChefHat,PackageCheck,Phone,MapPin,Bike,LoaderCircle,ShieldCheck,CheckCircle2} from 'lucide-react';

export type MerchantOrder={
 id:string;code:string;status:string;customer:string;phone:string;address:string;kitchen:string;
 items:{name:string;quantity:number;lineTotal:number}[];codTotal:number;foodSubtotal:number;
 placedAt:string;rider:string|null;riderPhone:string|null;dispatchRequestedAt:string|null;settlement:string;paymentMethod:string|null;paymentAmount:string|null;paymentSubmittedAt:string|null;merchantPayable:number;returnState:string
};
const tabs=[['ALL','All'],['PLACED','New'],['SEARCHING','Finding rider'],['MERCHANT_ACCEPTED','Accepted'],
 ['PREPARING','Preparing'],['RIDER_ASSIGNED','Rider dispatch'],['DELIVERED','Delivered'],['FAILED','Returns']] as const;
const workflow:Record<string,{next:string;label:string;danger?:boolean}[]>={
 MERCHANT_ACCEPTED:[{next:'PREPARING',label:'Start preparing'}],
 PREPARING:[{next:'READY_FOR_PICKUP',label:'Mark ready for pickup'}]
};
const display=(s:string)=>s.replaceAll('_',' ').toLowerCase().replace(/^./,x=>x.toUpperCase());
export default function MerchantOrdersManager({initial}:{initial:MerchantOrder[]}){
 const router=useRouter(),searchParams=useSearchParams();
 const [orders,setOrders]=useState(initial);
 const [search,setSearch]=useState('');
 const [filter,setFilter]=useState(searchParams.get('status')||'ALL');
 const [busy,setBusy]=useState<string|null>(null);
 const [notice,setNotice]=useState('');
 useEffect(()=>setOrders(initial),[initial]);
 const searching=orders.some(o=>o.status==='PLACED'&&o.dispatchRequestedAt&&!o.rider);
 useEffect(()=>{
  if(!searching)return;
  const interval=window.setInterval(()=>{
   if(document.visibilityState==='visible')router.refresh();
  },12000);
  return()=>window.clearInterval(interval);
 },[router,searching]);
 const shown=useMemo(()=>orders.filter(o=>{
  const matches=filter==='ALL'||(filter==='SEARCHING'
   ?o.status==='PLACED'&&Boolean(o.dispatchRequestedAt)&&!o.rider
   :filter==='RIDER_ASSIGNED'?['RIDER_ASSIGNED','READY_FOR_PICKUP'].includes(o.status):filter===o.status);
  return matches&&[o.code,o.kitchen,o.customer,o.phone,o.rider||''].join(' ').toLowerCase().includes(search.toLowerCase());
 }),[orders,filter,search]);
 async function requestPickup(order:MerchantOrder){
  if(busy)return;setBusy(order.id);setNotice('');
  try{
   const response=await fetch('/api/merchant/orders/'+encodeURIComponent(order.id)+'/request-pickup',{method:'POST',credentials:'same-origin'});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(data.error||'Pickup request failed');
   setNotice('Pickup notification sent to assigned rider for '+order.code+'.');
  }catch(e){setNotice(e instanceof Error?e.message:'Pickup request failed')}
  finally{setBusy(null)}
 }
 const refreshing=()=>{router.refresh();setNotice('Refreshing delivery assignment status…')};
 async function act(order:MerchantOrder,action:'find'|'status',next?:string){
  if(busy)return;
  if(next==='CANCELLED'&&!window.confirm('Decline order '+order.code+'? Customer will see it as cancelled and any reserved rider will be released.'))return;
  setBusy(order.id);setNotice('');
  try{
   const path='/api/merchant/orders/'+encodeURIComponent(order.id)+(action==='find'?'/find-rider':'');
   const response=await fetch(path,{
    method:action==='find'?'POST':'PATCH',
    credentials:'same-origin',headers:{'Content-Type':'application/json'},
    body:action==='find'?'{}':JSON.stringify({status:next})
   });
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(result.error||'Order update failed');
   if(action==='find'){
    setOrders(current=>current.map(o=>o.id===order.id?{
     ...o,dispatchRequestedAt:o.dispatchRequestedAt||new Date().toISOString()
    }:o));
    setNotice('Delivery man requested for '+order.code+'. All available riders can view this request. The first rider to accept is assigned automatically.');
   }else{
    const finalStatus=result.status||next||order.status;
    setOrders(current=>current.map(o=>o.id===order.id?{...o,status:finalStatus}:o));
    setNotice('Order '+order.code+' updated to '+display(finalStatus)+'.');
   }
   router.refresh();
  }catch(e){setNotice(e instanceof Error?e.message:'Unable to update order');router.refresh()}
  finally{setBusy(null)}
 }
 return <div className="merchant-orders-manager">
  <div className="merchant-rider-policy"><Bike size={23}/><div><strong>Delivery rider first, then order acceptance</strong>
   <p>Find rider broadcasts to online riders; the first rider to accept is assigned. Failed delivery parcels must be returned and confirmed by the merchant.</p></div></div>
  <div className="merchant-order-tabs" role="group" aria-label="Filter orders">
   {tabs.map(([id,label])=><button type="button" key={id} className={filter===id?'active':''} onClick={()=>setFilter(id)}>
    {label}
    {id==='PLACED'&&orders.some(o=>o.status==='PLACED')&&<b>{orders.filter(o=>o.status==='PLACED').length}</b>}
    {id==='SEARCHING'&&searching&&<b>{orders.filter(o=>o.status==='PLACED'&&o.dispatchRequestedAt&&!o.rider).length}</b>}
   </button>)}
  </div>
  <div className="merchant-order-tools"><div><Search size={18}/><input aria-label="Search merchant orders" placeholder="Search order ID, customer or phone" value={search} onChange={e=>setSearch(e.target.value)}/></div>
   <button type="button" onClick={refreshing}><RefreshCcw size={17}/> Refresh</button></div>
  {notice&&<div className="merchant-inline-alert" role="status">{notice}</div>}
  <div className="merchant-order-grid">{shown.map(order=>{
   const placed=order.status==='PLACED';
   const riderFound=Boolean(order.rider);
   const riderSearched=Boolean(order.dispatchRequestedAt);
   const waiting=placed&&riderSearched&&!riderFound;
   const working=busy===order.id;
   return <article className="merchant-order-card" key={order.id}>
    <div className="merchant-order-card-head"><div><small>ORDER · {new Date(order.placedAt).toLocaleString('en-BD',{timeZone:'Asia/Dhaka'})}</small><h3>{order.code}</h3><span className="merchant-order-kitchen">{order.kitchen}</span></div>
     <span className={'merchant-status-chip '+(waiting?'rider-searching':order.status.toLowerCase())}>{waiting?'Finding rider':display(order.status)}</span></div>
    <div className="merchant-order-card-customer"><strong>{order.customer}</strong><a href={'tel:'+order.phone}><Phone size={15}/>{order.phone}</a><small><MapPin size={15}/>{order.address}</small></div>
    <div className="merchant-order-card-items">{order.items.map((item,index)=><div key={index}><span>{item.quantity} × {item.name}</span><strong>৳{item.lineTotal.toFixed(2)}</strong></div>)}</div>
    <div className="merchant-order-card-totals"><span>Product subtotal <strong>৳{order.foodSubtotal.toFixed(2)}</strong></span><span>Customer COD <strong>৳{order.codTotal.toFixed(2)}</strong></span></div>
    {placed&&<div className={'merchant-preaccept-status '+(riderFound?'rider-found':waiting?'rider-searching':'rider-not-requested')}>
     {riderFound?<><CheckCircle2 size={21}/><div><strong>Delivery man found: {order.rider}</strong><p>Rider confirmed by Admin. You can now accept this order.</p>
      {order.riderPhone&&<a href={'tel:'+order.riderPhone}><Phone size={14}/> {order.riderPhone}</a>}</div></>:
     waiting?<><LoaderCircle size={21} className="merchant-loading-indicator"/><div><strong>Searching for delivery man…</strong><p>Broadcasting to available riders. Waiting for the first acceptance. This refreshes automatically.</p></div></>:
     <><Bike size={21}/><div><strong>Find a delivery man before accepting</strong><p>Request manual rider assignment from Admin to unlock acceptance.</p></div></>}
    </div>}
    {!placed&&order.rider&&<div className="merchant-order-rider"><CheckCheck size={17}/> Assigned rider: {order.rider}{order.riderPhone&&<a href={'tel:'+order.riderPhone} className="merchant-rider-phone"><Phone size={13}/>{order.riderPhone}</a>}</div>}
    {order.status==='FAILED'&&<MerchantReturnReview orderId={order.id} returnState={order.returnState}/>}
    {order.status==='RIDER_ASSIGNED'&&order.rider&&<MerchantDispatchProof orderId={order.id}/>}
    {order.status==='DELIVERED'&&order.settlement==='SUBMITTED'&&<MerchantPaymentReview orderId={order.id} orderCode={order.code} amount={order.merchantPayable} method={order.paymentMethod} submittedAt={order.paymentSubmittedAt} onConfirmed={()=>setOrders(current=>current.map(o=>o.id===order.id?{...o,settlement:'CLEARED'}:o))}/>}
    {order.status==='DELIVERED'&&order.settlement==='CLEARED'&&<p style={{color:'#098b64',fontWeight:700}}>Merchant settlement verified</p>}
    <div className="merchant-order-actions">
     {placed&&<>
      {!riderFound&&!riderSearched&&<button type="button" disabled={working} onClick={()=>void act(order,'find')}><Bike size={16}/> {working?'Requesting…':'Find delivery man'}</button>}
      {waiting&&<button className="merchant-rider-wait-button" disabled type="button"><Clock3 size={15}/> Waiting for Admin assignment</button>}
      {riderFound&&<button type="button" disabled={working} onClick={()=>void act(order,'status','MERCHANT_ACCEPTED')}><ShieldCheck size={16}/>{working?'Accepting…':'Accept order'}</button>}
      <button type="button" className="danger" disabled={working} onClick={()=>void act(order,'status','CANCELLED')}>Decline</button>
     </>}
     {order.rider&&['MERCHANT_ACCEPTED','PREPARING','RIDER_ASSIGNED'].includes(order.status)&&<button type="button" disabled={working} onClick={()=>void requestPickup(order)}><Bike size={16}/> Notify rider to pickup</button>}
     {workflow[order.status]?.map(a=><button key={a.next} className={a.danger?'danger':''} type="button" disabled={working}
      onClick={()=>void act(order,'status',a.next)}>{working?'Updating…':a.label}</button>)}
     <a href={'/orders/'+order.id}>View order & timeline →</a>
    </div>
   </article>;
  })}</div>
  {shown.length===0&&<div className="merchant-empty-state"><PackageCheck size={35}/><h3>{orders.length?'No matching orders':'No orders yet'}</h3><p>{orders.length?'Choose another status or search.':'Customer orders appear here as soon as they are placed.'}</p></div>}
  <p className="merchant-small-note">Showing latest {orders.length} orders. Rider requests are broadcast to eligible online riders. The first rider to accept is assigned automatically.</p>
 </div>;
}
