'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Banknote,CheckCircle2,ImageIcon,ShieldCheck,ZoomIn} from 'lucide-react';
export default function MerchantPaymentReview({orderId,orderCode,amount,method,submittedAt,onConfirmed}:{orderId:string;orderCode:string;amount:number;method:string|null;submittedAt:string|null;onConfirmed:()=>void}){
 const router=useRouter();
 const [reviewed,setReviewed]=useState(false),[received,setReceived]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[expanded,setExpanded]=useState(false);
 const proof='/api/merchant/orders/'+encodeURIComponent(orderId)+'/settlement-proof';
 async function confirm(){
  if(busy||!reviewed||!received)return;
  if(!window.confirm('Confirm ৳'+amount.toFixed(2)+' was actually received from the rider for order '+orderCode+'?'))return;
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/merchant/orders/'+encodeURIComponent(orderId)+'/confirm-settlement',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({reviewedEvidence:true,confirmedFundsReceived:true})});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(data.error||'Could not confirm payment');
   onConfirmed();router.refresh();
  }catch(e){setError(e instanceof Error?e.message:'Verification failed')}finally{setBusy(false)}
 }
 return <section className="merchant-payment-review">
  <div className="merchant-payment-review-head"><span className="merchant-payment-review-icon"><Banknote size={21}/></span><div><strong>Payment verification required</strong><p>Rider submitted payment evidence. Review it and verify funds before clearing.</p></div></div>
  <div className="merchant-payment-info"><div><small>Merchant amount due</small><strong>৳{amount.toFixed(2)}</strong></div><div><small>Payment method</small><strong>{method==='BKASH'?'bKash':method==='CASH'?'Cash':'Not specified'}</strong></div>{submittedAt&&<div><small>Submitted</small><strong>{new Date(submittedAt).toLocaleString('en-BD',{timeZone:'Asia/Dhaka'})}</strong></div>}</div>
  <div className="merchant-payment-proof"><div className="merchant-payment-proof-title"><ImageIcon size={18}/><strong>Rider payment evidence</strong></div><img src={proof} alt={'Payment proof submitted for order '+orderCode} loading="lazy" onClick={()=>setExpanded(true)} /><button type="button" onClick={()=>setExpanded(true)}><ZoomIn size={16}/> Enlarge proof</button></div>
  {expanded&&<div className="merchant-proof-overlay" role="dialog" aria-modal="true" aria-label="Payment proof"><div className="merchant-proof-modal"><button type="button" onClick={()=>setExpanded(false)} aria-label="Close image">Close ✕</button><img src={proof} alt={'Enlarged rider payment proof for '+orderCode}/></div></div>}
  <label className="merchant-payment-check"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/> I have reviewed the rider's submitted proof.</label>
  <label className="merchant-payment-check"><input type="checkbox" checked={received} onChange={e=>setReceived(e.target.checked)}/> I independently verified receiving ৳{amount.toFixed(2)} by {method==='CASH'?'cash':'the selected payment method'}.</label>
  <button className="merchant-payment-confirm" type="button" onClick={()=>void confirm()} disabled={busy||!reviewed||!received}><ShieldCheck size={18}/>{busy?'Confirming…':'Mark cash/payment received'}</button>
  {error&&<p className="merchant-payment-error" role="alert">{error}</p>}
  <small className="merchant-payment-warning">A screenshot alone does not prove payment. Check the actual bKash balance/transaction or cash received.</small>
 </section>;
}
