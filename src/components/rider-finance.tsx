'use client';
import {useMemo,useState} from 'react';
import {Wallet,Truck,CalendarDays,CheckCircle2,Clock3} from 'lucide-react';
type RecordRow={id:string;code:string;deliveredAt:string;cod:number;fee:number;net:number;status:'PENDING'|'SUBMITTED'|'CLEARED'};
export default function RiderFinance({records,mode}:{records:RecordRow[];mode:'overview'|'wallet'}){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const [from,setFrom]=useState(today),[to,setTo]=useState(today);
 const filtered=useMemo(()=>records.filter(r=>{const d=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(r.deliveredAt));return d>=from&&d<=to}),[records,from,to]);
 const money=(n:number)=>'৳'+n.toFixed(2);
 const earned=filtered.reduce((a,r)=>a+r.fee,0),net=filtered.reduce((a,r)=>a+r.net,0),pending=filtered.filter(r=>r.status!=='CLEARED').reduce((a,r)=>a+r.net,0);
 return <section className="rd-finance">
  <div className="rd-finance-heading"><div><h2>{mode==='overview'?'Rider earnings':'Wallet & settlement history'}</h2><p>Delivery-charge earnings and COD settlement are tracked separately.</p></div><div className="rd-finance-date"><label>From<input type="date" value={from} max={to} onChange={e=>setFrom(e.target.value)}/></label><label>To<input type="date" value={to} min={from} onChange={e=>setTo(e.target.value)}/></label><button type="button" onClick={()=>{setFrom(today);setTo(today)}}>Today</button></div></div>
  <div className="rd-finance-cards">
   <div><span><Truck size={19}/> Rider earnings</span><strong>{money(earned)}</strong><small>{filtered.length} delivered orders in range</small></div>
   <div><span><Wallet size={19}/> Payable to merchants</span><strong>{money(pending)}</strong><small>Uncleared COD less delivery charges</small></div>
   <div><span><CheckCircle2 size={19}/> Settled with merchants</span><strong>{money(net-pending)}</strong><small>Merchant-confirmed settlements</small></div>
  </div>
  {mode==='wallet'&&<div className="rd-finance-history"><h3>Wallet transaction history</h3><div className="rd-finance-table-wrap"><table><thead><tr><th>Date & order</th><th>Collected COD</th><th>Delivery earning</th><th>Pay merchant</th><th>Status</th></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td><strong>{r.code}</strong><small>{new Date(r.deliveredAt).toLocaleString('en-BD',{timeZone:'Asia/Dhaka'})}</small></td><td>{money(r.cod)}</td><td className="rd-positive">{money(r.fee)}</td><td>{money(r.net)}</td><td><span className={'rd-finance-state '+r.status.toLowerCase()}>{r.status==='CLEARED'?'Payment cleared':r.status==='SUBMITTED'?'Awaiting merchant':'Payment due'}</span></td></tr>)}</tbody></table>{filtered.length===0&&<p className="rd-finance-empty">No delivered orders in the selected dates. Change the range to view previous earnings and transactions.</p>}</div></div>}
  <p className="rd-finance-note">Earnings are based on delivery fees for successfully delivered orders. Merchant payouts clear only after merchant verification. Date range uses Bangladesh local dates.</p>
 </section>;
}
