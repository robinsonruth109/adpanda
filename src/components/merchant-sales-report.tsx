import Link from 'next/link';
import {CalendarDays,TrendingUp,PackageCheck,ShoppingBag,RotateCcw} from 'lucide-react';
type Product={name:string;quantity:number;orders:number;sales:number};
export default function MerchantSalesReport({from,to,today,orders,units,revenue,average,failed,products}:{from:string;to:string;today:string;orders:number;units:number;revenue:number;average:number;failed:number;products:Product[]}){
 const money=(v:number)=>'৳'+v.toLocaleString('en-BD',{minimumFractionDigits:2,maximumFractionDigits:2});
 return <section className="merchant-dashboard-surface merchant-sales-report" id="sales-report">
 <div className="merchant-surface-heading"><div><span className="merchant-kicker">SALES ANALYTICS</span><h2>Sales & product performance</h2><p>Only successfully delivered orders are counted as sales.</p></div></div>
 <form className="merchant-sales-filter" method="GET" action="/merchant">
  <label>From date<input name="from" type="date" max={today} required defaultValue={from} key={'f'+from}/></label>
  <label>To date<input name="to" type="date" max={today} required defaultValue={to} key={'t'+to}/></label>
  <button type="submit"><CalendarDays size={17}/> Apply filter</button>
  <Link href="/merchant#sales-report"><RotateCcw size={15}/> Today</Link>
 </form>
 <div className="merchant-sales-stats">
  <div><span><TrendingUp size={19}/> Product sales</span><strong>{money(revenue)}</strong><small>Delivered food/product value; excludes delivery fees</small></div>
  <div><span><PackageCheck size={19}/> Delivered orders</span><strong>{orders}</strong><small>Successful deliveries within selected range</small></div>
  <div><span><ShoppingBag size={19}/> Items sold</span><strong>{units}</strong><small>Sum of delivered item quantities</small></div>
  <div><span>Average order sale</span><strong>{money(average)}</strong><small>Failed orders: {failed} (excluded from sales)</small></div>
 </div>
 <div className="merchant-product-report">
  <div className="merchant-product-report-heading"><h3>Product-wise sales report</h3><span>{from===to?from:from+' to '+to}</span></div>
  <div className="merchant-product-report-scroll"><table><thead><tr><th>Product</th><th>Qty sold</th><th>Orders</th><th>Sales amount</th><th>% of sales</th></tr></thead><tbody>
  {products.map((p,i)=><tr key={i}><td><strong>{p.name}</strong></td><td>{p.quantity}</td><td>{p.orders}</td><td><strong>{money(p.sales)}</strong></td><td>{revenue>0?(100*p.sales/revenue).toFixed(1)+'%':'0%'}</td></tr>)}
  </tbody></table></div>
  {!products.length&&<div className="merchant-empty-state"><ShoppingBag size={27}/><h3>No delivered sales</h3><p>Select another date range to see product performance.</p></div>}
 </div>
 <p className="merchant-small-note">Figures are based on successful delivery timestamps in Bangladesh time. Failed, cancelled and returned orders are excluded. Commission and other fees are not deducted from product sales.</p>
 </section>;
}
