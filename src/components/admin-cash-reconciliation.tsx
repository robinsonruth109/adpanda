'use client';

import {useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Banknote,CheckCircle2,ClipboardList,History,ReceiptText,RefreshCw,Search,ShieldCheck,Wallet} from 'lucide-react';

export type CashRider={id:string;name:string;phone:string;collected:string;deposited:string;outstanding:string};
export type CashDepositRow={id:string;rider:string;amount:string;reference:string;createdAt:string};
export type CashSettlementRow={id:string;merchant:string;amount:string;status:string;reference:string|null;createdAt:string};
export type CashCollectionRow={id:string;orderCode:string;rider:string;amount:string;createdAt:string};

const fmt=(value:string)=>'৳'+Number(value).toLocaleString('en-BD',{minimumFractionDigits:2,maximumFractionDigits:2});
const time=(iso:string)=>new Date(iso).toLocaleString('en-BD',{timeZone:'Asia/Dhaka',dateStyle:'medium',timeStyle:'short'});
export default function AdminCashReconciliation({
 riders,deposits,collections,settlements,totalCollected,totalDeposited,deliveredAwaitingCod
}:{
 riders:CashRider[];deposits:CashDepositRow[];collections:CashCollectionRow[];settlements:CashSettlementRow[];
 totalCollected:string;totalDeposited:string;deliveredAwaitingCod:number
}){
 const router=useRouter();
 const [riderId,setRiderId]=useState(''),[amount,setAmount]=useState(''),[reference,setReference]=useState('');
 const [confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [search,setSearch]=useState('');
 const selected=riders.find(r=>r.id===riderId);
 const rows=useMemo(()=>riders.filter(r=>[r.name,r.phone].join(' ').toLowerCase().includes(search.toLowerCase())),[riders,search]);
 const outstanding=Number(totalCollected)-Number(totalDeposited);
 const canSubmit=selected&&Number(amount)>0&&reference.trim().length>=3&&confirmed&&!busy;
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!selected||!canSubmit)return;
  if(!window.confirm('Confirm you have physically received '+fmt(Number(amount).toFixed(2))+' from '+selected.name+'? This creates a permanent audited cash deposit.'))return;
  setBusy(true);setMessage('');
  try{
   const result=await fetch('/api/admin/finance/deposits',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    riderId:selected.id,amount:Number(amount),reference:reference.trim(),confirmed:true
   })});
   const data=await result.json();
   if(!result.ok)throw Error(data.error||'Cash deposit could not be recorded');
   setMessage('Recorded '+data.reference+'. Rider outstanding after deposit: '+fmt(data.outstandingAfter)+'.');
   setAmount('');setReference('');setConfirmed(false);setRiderId('');
   router.refresh();
  }catch(error){setMessage(error instanceof Error?error.message:'Cash deposit failed. Refresh and retry.')}
  finally{setBusy(false)}
 }
 return <div className="adp-finance-dashboard">
  <div className="adp-finance-stats">
   <div><span className="adp-finance-icon pink"><Wallet size={21}/></span><small>Recorded COD collections</small><strong>{fmt(totalCollected)}</strong><span>Only rider-confirmed cash receipts</span></div>
   <div><span className="adp-finance-icon green"><CheckCircle2 size={21}/></span><small>Cash received by Admin</small><strong>{fmt(totalDeposited)}</strong><span>Recorded deposits</span></div>
   <div><span className="adp-finance-icon orange"><Banknote size={21}/></span><small>Unreconciled rider cash</small><strong>{fmt(outstanding.toFixed(2))}</strong><span>Collections less deposits</span></div>
   <div><span className="adp-finance-icon blue"><ClipboardList size={21}/></span><small>Delivered, COD not confirmed</small><strong>{deliveredAwaitingCod}</strong><span>Needs rider cash confirmation</span></div>
  </div>

  <div className="adp-finance-columns">
   <section className="adp-finance-panel">
    <div className="adp-finance-panel-heading"><div><span className="admin-overline">CASH HANDOVER</span><h2>Record rider deposit</h2><p>Use only when the cash has physically been handed to an Admin.</p></div><Banknote size={24}/></div>
    <form className="adp-deposit-form" onSubmit={submit}>
     <label>Select rider<select required value={riderId} onChange={e=>{setRiderId(e.target.value);setAmount('');setConfirmed(false)}}><option value="">Choose a rider</option>{riders.filter(r=>Number(r.outstanding)>0).map(r=><option key={r.id} value={r.id}>{r.name} · {fmt(r.outstanding)} outstanding</option>)}</select></label>
     {selected&&<div className="adp-deposit-balance"><span>Available to reconcile</span><strong>{fmt(selected.outstanding)}</strong><small>From recorded COD cash receipts, not order estimates.</small></div>}
     <label>Cash received (BDT)<input required type="number" min="0.01" max={selected?selected.outstanding:'1000000'} step="0.01" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></label>
     <label>Unique cash handover reference<input required minLength={3} maxLength={100} value={reference} onChange={e=>setReference(e.target.value)} placeholder="Receipt / handover slip ID"/></label>
     <label className="adp-deposit-confirm"><input type="checkbox" required checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I personally verified the physical cash received and receipt reference.</label>
     <button type="submit" className="btn" disabled={!canSubmit}>{busy?'Recording deposit…':'Confirm cash received'}</button>
     {message&&<p className="adp-finance-feedback" role="status">{message}</p>}
    </form>
   </section>
   <section className="adp-finance-panel">
    <div className="adp-finance-panel-heading"><div><span className="admin-overline">RIDER RECONCILIATION</span><h2>COD balances</h2><p>Rider-wise collected, deposited and outstanding cash.</p></div><ShieldCheck size={24}/></div>
    <div className="adp-finance-search"><Search size={17}/><input aria-label="Search rider name or phone" placeholder="Search riders or phone number" value={search} onChange={e=>setSearch(e.target.value)}/></div>
    <div className="adp-finance-rider-list">{rows.map(r=><div className="adp-finance-rider-row" key={r.id}><div><strong>{r.name}</strong><small>{r.phone}</small><span>Received {fmt(r.collected)} · Deposited {fmt(r.deposited)}</span></div><div><strong>{fmt(r.outstanding)}</strong><small>{Number(r.outstanding)>0?'Due from rider':'Settled'}</small><button type="button" disabled={Number(r.outstanding)<=0} onClick={()=>{setRiderId(r.id);setAmount('');setConfirmed(false)}}>Select</button></div></div>)}{rows.length===0&&<div className="admin-empty">No riders match this search.</div>}</div>
   </section>
  </div>

  <section className="adp-finance-panel">
   <div className="adp-finance-panel-heading"><div><span className="admin-overline">LATEST 50</span><h2>Cash deposit history</h2><p>Permanent receipts created by Admin after cash handover.</p></div><History size={24}/></div>
   <div className="admin-table-scroll"><table className="admin-data-table"><thead><tr><th>Time</th><th>Rider</th><th>Cash received</th><th>Unique reference</th></tr></thead><tbody>{deposits.map(d=><tr key={d.id}><td>{time(d.createdAt)}</td><td>{d.rider}</td><td><strong>{fmt(d.amount)}</strong></td><td>{d.reference}</td></tr>)}</tbody></table>{!deposits.length&&<div className="admin-empty">No rider cash deposits have been recorded.</div>}</div>
  </section>
  <section className="adp-finance-panel">
   <div className="adp-finance-panel-heading"><div><span className="admin-overline">LATEST 50</span><h2>Rider-confirmed COD receipts</h2><p>Receipt does not mean the money has reached Admin.</p></div><ReceiptText size={24}/></div>
   <div className="admin-table-scroll"><table className="admin-data-table"><thead><tr><th>Time</th><th>Order</th><th>Rider</th><th>Collected cash</th></tr></thead><tbody>{collections.map(c=><tr key={c.id}><td>{time(c.createdAt)}</td><td>{c.orderCode}</td><td>{c.rider}</td><td><strong>{fmt(c.amount)}</strong></td></tr>)}</tbody></table>{!collections.length&&<div className="admin-empty">No COD cash receipts have been confirmed.</div>}</div>
  </section>
  <section className="adp-finance-panel">
   <div className="adp-finance-panel-heading"><div><span className="admin-overline">MERCHANT PAYABLES</span><h2>Merchant settlements</h2><p>Merchant payouts are separate from rider cash handover. This list is read-only.</p></div><Banknote size={24}/></div>
   <div className="admin-table-scroll"><table className="admin-data-table"><thead><tr><th>Merchant</th><th>Amount</th><th>Status</th><th>Reference</th></tr></thead><tbody>{settlements.map(s=><tr key={s.id}><td>{s.merchant}</td><td>{fmt(s.amount)}</td><td>{s.status}</td><td>{s.reference||'—'}</td></tr>)}</tbody></table>{!settlements.length&&<div className="admin-empty">No merchant settlements yet.</div>}</div>
  </section>
  <div className="adp-finance-fine-print"><RefreshCw size={15}/> Dashboard reads the live database on refresh. Reconciliation prevents deposits exceeding rider-confirmed COD. Merchant payables and rider earnings are not automatically settled.</div>
 </div>;
}
