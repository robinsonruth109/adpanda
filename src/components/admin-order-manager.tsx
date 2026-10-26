'use client';
import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Bike,CheckCircle2,Clock3,MapPin,Search,ShoppingBag,Truck,Utensils,Phone,RefreshCw} from 'lucide-react';

export type AdminOrder={id:string;code:string;status:string;customer:string;phone:string;kitchen:string;address:string;codTotal:number;codCollected:boolean;placedAt:string;dispatchRequestedAt:string|null;riderId:string|null;riderName:string|null};
export type AvailableRider={id:string;name:string;phone:string};
const choices:Record<string,{label:string;status:string;danger?:boolean}[]>={
 PLACED:[{label:'Cancel order',status:'CANCELLED',danger:true}],
 MERCHANT_ACCEPTED:[{label:'Start preparing',status:'PREPARING'},{label:'Cancel order',status:'CANCELLED',danger:true}],
 PREPARING:[{label:'Ready for pickup',status:'READY_FOR_PICKUP'},{label:'Cancel order',status:'CANCELLED',danger:true}],
 READY_FOR_PICKUP:[{label:'Cancel order',status:'CANCELLED',danger:true}],
 RIDER_ASSIGNED:[{label:'Picked up',status:'PICKED_UP'},{label:'Cancel order',status:'CANCELLED',danger:true}],
 PICKED_UP:[{label:'Out for delivery',status:'OUT_FOR_DELIVERY'},{label:'Failed delivery',status:'FAILED',danger:true}],
 OUT_FOR_DELIVERY:[{label:'Mark delivered',status:'DELIVERED'},{label:'Failed delivery',status:'FAILED',danger:true}]
};
const filters=['ALL','RIDER_SEARCH','PLACED','MERCHANT_ACCEPTED','PREPARING','READY_FOR_PICKUP','RIDER_ASSIGNED','PICKED_UP','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','FAILED'];
const display=(status:string)=>status.replaceAll('_',' ').toLowerCase().replace(/^./,s=>s.toUpperCase());
export default function AdminOrderManager({initialOrders,availableRiders}:{initialOrders:AdminOrder[];availableRiders:AvailableRider[]}){
 const router=useRouter();
 const [orders,setOrders]=useState(initialOrders),[term,setTerm]=useState(''),[filter,setFilter]=useState('ALL'),[selected,setSelected]=useState<Record<string,string>>({}),[busy,setBusy]=useState<string|null>(null),[message,setMessage]=useState('');
 useEffect(()=>setOrders(initialOrders),[initialOrders]);
 const visible=useMemo(()=>orders.filter(o=>(filter==='ALL'||filter===o.status||(filter==='RIDER_SEARCH'&&o.status==='PLACED'&&!!o.dispatchRequestedAt&&!o.riderId))&&[o.code,o.customer,o.phone,o.kitchen,o.riderName||''].join(' ').toLowerCase().includes(term.trim().toLowerCase())),[orders,filter,term]);
 const pending=orders.filter(o=>!['DELIVERED','CANCELLED','FAILED'].includes(o.status)).length;
 async function mutate(order:AdminOrder,action:'status'|'dispatch'|'unassign',status?:string){
  if(busy)return;
  if((status==='CANCELLED'||status==='FAILED'||status==='DELIVERED')&&!window.confirm('Confirm '+display(status)+' for order '+order.code+'?'))return;
  if(action==='unassign'&&!window.confirm('Release this rider? Merchant will have to wait for another rider before acceptance.'))return;
  const riderId=selected[order.id];
  if(action==='dispatch'&&!riderId){setMessage('Select an available rider first.');return}
  setBusy(order.id);setMessage('');
  try{
   const response=await fetch('/api/admin/orders/'+encodeURIComponent(order.id)+'/'+action,{method:action==='status'?'PATCH':'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(action==='status'?{status}:action==='dispatch'?{riderId}:{})});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||'Action failed');
   setOrders(prev=>prev.map(o=>o.id===order.id?{...o,status:data.status||o.status,riderId:action==='dispatch'?riderId:action==='unassign'?null:o.riderId,riderName:action==='dispatch'?(availableRiders.find(r=>r.id===riderId)?.name||null):action==='unassign'?null:o.riderName}:o));
   setMessage('Order '+order.code+' updated successfully. COD collection is recorded separately.');
   router.refresh();
  }catch(error){setMessage(error instanceof Error?error.message:'Could not update order');router.refresh()}finally{setBusy(null)}
 }
 return <div className="admin-order-screen">
  <div className="admin-rider-search-banner"><Bike size={21}/><div><strong>{orders.filter(o=>o.status==='PLACED'&&o.dispatchRequestedAt&&!o.riderId).length} rider search requests waiting</strong><p>Merchants cannot accept orders until Admin assigns an approved, online delivery rider. Select a rider below and confirm reservation.</p></div><button type="button" onClick={()=>setFilter('RIDER_SEARCH')}>Show requests</button></div>
  <div className="admin-order-kpis">
   <div><ShoppingBag size={21}/><span>Total orders</span><strong>{orders.length}</strong></div>
   <div><Clock3 size={21}/><span>In progress</span><strong>{pending}</strong></div>
   <div><Truck size={21}/><span>On the way</span><strong>{orders.filter(o=>['PICKED_UP','OUT_FOR_DELIVERY'].includes(o.status)).length}</strong></div>
   <div><CheckCircle2 size={21}/><span>Delivered</span><strong>{orders.filter(o=>o.status==='DELIVERED').length}</strong></div>
  </div>
  <div className="admin-order-filters">
   <div className="admin-order-search"><Search size={18}/><input placeholder="Search order, customer, phone or kitchen" aria-label="Search orders" value={term} onChange={e=>setTerm(e.target.value)}/></div>
   <select aria-label="Filter order status" value={filter} onChange={e=>setFilter(e.target.value)}>{filters.map(f=><option key={f} value={f}>{f==='ALL'?'All statuses':f==='RIDER_SEARCH'?'🚴 Rider requests':display(f)}</option>)}</select>
   <button type="button" onClick={()=>router.refresh()} aria-label="Refresh orders"><RefreshCw size={18}/> Refresh</button>
  </div>
  {message&&<p className="admin-order-notice" role="status">{message}</p>}
  <div className="admin-order-list">{visible.map(order=><article className="admin-order-card" key={order.id}>
   <div className="admin-order-card-head"><div><span className="admin-order-eyebrow">ORDER</span><h3>{order.code}</h3><small>{new Date(order.placedAt).toLocaleString('en-BD',{timeZone:'Asia/Dhaka'})}</small></div><span className={'admin-order-badge '+order.status.toLowerCase()}>{display(order.status)}</span></div>
   <div className="admin-order-card-grid">
    <div><span><Phone size={15}/> Customer</span><strong>{order.customer}</strong><a href={'tel:'+order.phone}>{order.phone}</a></div>
    <div><span><Utensils size={15}/> Kitchen</span><strong>{order.kitchen}</strong><small><MapPin size={13}/> {order.address}</small></div>
    <div><span><Bike size={15}/> Rider</span><strong>{order.riderName||'Not assigned'}</strong><small>{order.riderName?order.status==='PLACED'?'Reserved — waiting for Merchant acceptance':'Assigned to delivery':order.dispatchRequestedAt?'Merchant requested delivery rider':'Waiting for Merchant to request a rider'}</small></div>
    <div><span>COD total</span><strong className="admin-order-price">৳{order.codTotal.toLocaleString('en-BD',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong><small>Cash on delivery</small></div>
   </div>
   {order.status==='PLACED'&&Boolean(order.riderId)&&<div className="admin-dispatch-reservation">
    <CheckCircle2 size={18}/><span>Rider reserved. Merchant can now accept this order.</span>
    <button type="button" disabled={busy===order.id} onClick={()=>mutate(order,'unassign')}>Release / replace rider</button>
   </div>}
   {((order.status==='PLACED'&&!!order.dispatchRequestedAt)||order.status==='READY_FOR_PICKUP')&&!order.riderId&&<div className="admin-dispatch-controls"><label htmlFor={'rider-'+order.id}>Reserve an approved, online delivery rider before Merchant accepts</label><div><select id={'rider-'+order.id} value={selected[order.id]||''} onChange={e=>setSelected(prev=>({...prev,[order.id]:e.target.value}))}><option value="">Select available rider</option>{availableRiders.map(r=><option key={r.id} value={r.id}>{r.name} · {r.phone}</option>)}</select><button disabled={busy===order.id||!selected[order.id]} onClick={()=>mutate(order,'dispatch')}>Confirm rider</button></div></div>}
   <p className="admin-order-tracking-link"><a href={'/orders/'+order.id}>View order details & live rider tracking ↗</a></p>
   {choices[order.status]?.length>0&&<div className="admin-order-actions">{choices[order.status].map(action=><button key={action.status} type="button" disabled={busy===order.id} className={action.danger?'danger':''} onClick={()=>mutate(order,'status',action.status)}>{busy===order.id?'Updating…':action.label}</button>)}</div>}
  </article>)}</div>
  {visible.length===0&&<div className="admin-empty"><ShoppingBag size={38}/><h3>{orders.length?'No matching orders':'No orders yet'}</h3><p>{orders.length?'Adjust your search or status filter.':'Orders will appear here once customers place them.'}</p></div>}
  <p className="muted" style={{fontSize:12,marginTop:18}}>Showing latest {orders.length} orders. Rider assignment is manual and happens before Merchant acceptance. Marking delivered does not automatically confirm COD cash collection.</p>
 </div>;
}
