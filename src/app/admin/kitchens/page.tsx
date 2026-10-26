import {db} from '@/lib/db';
import {storeTypeContent} from '@/lib/store-types';
import {kitchenAvailability,groceryPriceCheckNeeded} from '@/lib/kitchen-hours';
export const dynamic='force-dynamic';
export default async function Page(){
 const shops=await db.kitchen.findMany({include:{merchant:true,categories:{include:{_count:{select:{items:true}}}}},orderBy:[{storeType:'asc'},{name:'asc'}],take:300});
 return <section className="admin-workspace">
  <span className="admin-overline">MARKETPLACE CATALOG</span>
  <h1>Stores & shops</h1><p className="muted">Food kitchens, grocery markets এবং stationery shops-এর live inventory, status, location ও commission।</p>
  <div className="adp-admin-store-summary">{(['FOOD','GROCERY','STATIONERY'] as const).map(type=><div key={type}><span>{storeTypeContent[type].emoji} {storeTypeContent[type].name}</span><strong>{shops.filter(s=>s.storeType===type).length}</strong></div>)}</div>
  <div className="admin-table-scroll"><table className="admin-data-table"><thead><tr><th>Store</th><th>Shop type</th><th>Merchant</th><th>Approval</th><th>Open for orders</th><th>Products</th><th>Commission</th></tr></thead><tbody>{shops.map(s=><tr key={s.id}>
   <td><strong>{s.name}</strong><small>{s.address}</small></td>
   <td><span className="adp-admin-type-chip">{storeTypeContent[s.storeType].emoji} {storeTypeContent[s.storeType].name}</span></td>
   <td>{s.merchant.name}</td><td>{s.merchant.status}</td><td>{kitchenAvailability({...s,merchant:{status:s.merchant.status}}).open?'Yes':'No'}{groceryPriceCheckNeeded(s)&&<small style={{color:'#d2256c'}}>⚠ Daily price review required</small>}</td>
   <td>{s.categories.reduce((n,c)=>n+c._count.items,0)}</td>
   <td>{s.commissionRate===null?'Not set':String(s.commissionRate)+'%'}</td>
  </tr>)}</tbody></table>
  {shops.length===0&&<div className="admin-empty">No approved or pending stores yet.</div>}</div>
 </section>;
}
