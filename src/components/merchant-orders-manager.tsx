'use client';
import {useEffect,useMemo,useState} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {Search,RefreshCcw,Clock3,CheckCheck,ChefHat,PackageCheck,Phone,MapPin} from 'lucide-react';

export type MerchantOrder={id:string;code:string;status:string;customer:string;phone:string;address:string;kitchen:string;items:{name:string;quantity:number;lineTotal:number}[];codTotal:number;foodSubtotal:number;placedAt:string;rider:string|null};
const tabs=[['ALL','All'],['PLACED','New'],['MERCHANT_ACCEPTED','Accepted'],['PREPARING','Preparing'],['READY_FOR_PICKUP','Ready'],['RIDER_ASSIGNED','Dispatch'],['DELIVERED','Delivered']] as const;
const workflow:Record<string,{next:string;label:string;danger?:boolean}[]>={
 PLACED:[{next:'MERCHANT_ACCEPTED',label:'Accept order'},{next:'CANCELLED',label:'Decline',danger:true}],
 MERCHANT_ACCEPTED:[{next:'PREPARING',label:'Start preparing'}],
 PREPARING:[{next:'READY_FOR_PICKUP',label:'Mark ready for pickup'}]
};
const display=(s:string)=>s.replaceAll('_',' ').toLowerCase().replace(/^./,x=>x.toUpperCase());
export default function MerchantOrdersManager({initial}:{initial:MerchantOrder[]}){
 const router=useRouter();const searchParams=useSearchParams();
 const [orders,setOrders]=useState(initial),[search,setSearch]=useState(''),[filter,setFilter]=useState(searchParams.get('status')||'ALL'),[busy,setBusy]=useState<string|null>(null),[notice,setNotice]=useState('');
 useEffect(()=>setOrders(initial),[initial]);
 const shown=useMemo(()=>orders.filter(o=>(filter==='ALL'||filter===o.status)&&[o.code,o.kitchen,o.customer,o.phone].join(' ').toLowerCase().includes(search.toLowerCase())),[orders,filter,search]);
 async function update(order:MerchantOrder,next:string){
  if(busy)return;
  if(next==='CANCELLED'&&!window.confirm('Decline order '+order.code+'? The customer will see it as cancelled.'))return;
  setBusy(order.id);setNotice('');
  try{const result=await fetch('/api/merchant/orders/'+encodeURIComponent(order.id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:next})});const data=await result.json();if(!result.ok)throw Error(data.error||'Order update failed');setOrders(v=>v.map(o=>o.id===order.id?{...o,status:next}:o));setNotice('Order '+order.code+' updated to '+display(next)+'.');router.refresh()}catch(e){setNotice(e instanceof Error?e.message:'Unable to update order');router.refresh()}finally{setBusy(null)}
 }
 return <div className="merchant-orders-manager">
  <div className="merchant-order-tabs" role="group" aria-label="Filter orders">{tabs.map(([id,label])=><button type="button" key={id} className={filter===id?'active':''} onClick={()=>setFilter(id)}>{label}{id==='PLACED'&&orders.some(o=>o.status==='PLACED')&&<b>{orders.filter(o=>o.status==='PLACED').length}</b>}</button>)}</div>
  <div className="merchant-order-tools"><div><Search size={18}/><input aria-label="Search merchant orders" placeholder="Search order ID, customer or phone" value={search} onChange={e=>setSearch(e.target.value)}/></div><button type="button" onClick={()=>router.refresh()}><RefreshCcw size={17}/> Refresh</button></div>
  {notice&&<div className="merchant-inline-alert" role="status">{notice}</div>}
  <div className="merchant-order-grid">{shown.map(order=><article className="merchant-order-card" key={order.id}>
   <div className="merchant-order-card-head"><div><small>ORDER · {new Date(order.placedAt).toLocaleString('en-BD',{timeZone:'Asia/Dhaka'})}</small><h3>{order.code}</h3><span className="merchant-order-kitchen">{order.kitchen}</span></div><span className={'merchant-status-chip '+order.status.toLowerCase()}>{display(order.status)}</span></div>
   <div className="merchant-order-card-customer"><strong>{order.customer}</strong><a href={'tel:'+order.phone}><Phone size={15}/>{order.phone}</a><small><MapPin size={15}/>{order.address}</small></div>
   <div className="merchant-order-card-items">{order.items.map((i,index)=><div key={index}><span>{i.quantity} × {i.name}</span><strong>৳{i.lineTotal.toFixed(2)}</strong></div>)}</div>
   <div className="merchant-order-card-totals"><span>Food subtotal <strong>৳{order.foodSubtotal.toFixed(2)}</strong></span><span>Customer COD <strong>৳{order.codTotal.toFixed(2)}</strong></span></div>
   {order.rider&&<div className="merchant-order-rider"><CheckCheck size={17}/> Rider: {order.rider}</div>}
   <div className="merchant-order-actions">{workflow[order.status]?.map(a=><button key={a.next} className={a.danger?'danger':''} type="button" disabled={busy===order.id} onClick={()=>update(order,a.next)}>{busy===order.id?'Updating…':a.label}</button>)}<a href={'/orders/'+order.id}>View order & timeline →</a></div>
  </article>)}</div>
  {shown.length===0&&<div className="merchant-empty-state"><PackageCheck size={35}/><h3>{orders.length?'No matching orders':'No orders yet'}</h3><p>{orders.length?'Choose another status or search.':'Customer orders will appear here as soon as they are placed.'}</p></div>}
  <p className="merchant-small-note">Showing latest {orders.length} orders. Admin controls rider dispatch; the kitchen can accept, prepare and mark orders ready.</p>
 </div>;
}
