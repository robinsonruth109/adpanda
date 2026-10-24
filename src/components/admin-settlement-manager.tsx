'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
type Row={id:string;merchant:string;amount:string;status:string;method:string|null;account:string|null;bankName:string|null;createdAt:string;requestedById:string|null;reference:string|null;reviewNote:string|null};
export default function AdminSettlementManager({rows,liquidity}:{rows:Row[];liquidity:string}){
 const router=useRouter();const [busy,setBusy]=useState<string|null>(null);const [notes,setNotes]=useState<Record<string,string>>({});const [refs,setRefs]=useState<Record<string,string>>({});const [message,setMessage]=useState('');
 const currency=(v:string)=>'৳'+Number(v).toLocaleString('en-BD',{minimumFractionDigits:2,maximumFractionDigits:2});
 const counts={pending:rows.filter(r=>r.status==='PENDING').length,approved:rows.filter(r=>r.status==='APPROVED').length,paid:rows.filter(r=>r.status==='PAID').length};
 async function act(row:Row,action:'APPROVE'|'REJECT'|'PAID'){
  if(busy)return;
  const note=(notes[row.id]||'').trim(),reference=(refs[row.id]||'').trim();
  if(action==='REJECT'&&note.length<5){setMessage('Provide a rejection reason of at least 5 characters.');return}
  if(action==='PAID'&&reference.length<4){setMessage('Enter the unique payment transfer reference before marking paid.');return}
  if(!window.confirm(action==='PAID'?'Confirm you have ALREADY transferred '+currency(row.amount)+' to '+row.merchant+'? This will mark the payout PAID.':action+' payout of '+currency(row.amount)+' for '+row.merchant+'?'))return;
  setBusy(row.id);setMessage('');
  try{const res=await fetch('/api/admin/settlements/'+encodeURIComponent(row.id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,note,reference:action==='PAID'?reference:undefined,transferConfirmed:action==='PAID'})});
   const data=await res.json();if(!res.ok)throw Error(data.error||'Could not update payout');
   setMessage('Payout '+row.id.slice(0,8)+' changed to '+data.status+'.');router.refresh();
  }catch(error){setMessage(error instanceof Error?error.message:'Payout update failed')}finally{setBusy(null)}
 }
 return <div className="adp-admin-settlements">
  <div className="adp-pay-stats">{[['Pending approval',counts.pending],['Approved unpaid',counts.approved],['Paid in latest records',counts.paid],['Recorded cash ceiling',currency(liquidity)]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
  <p className="adp-pay-hint">Cash ceiling = total recorded rider deposits minus past paid merchant settlements. This is not a real bank balance. Check available funds and bank transfer proof before marking paid.</p>
  {message&&<p className="adp-settlement-message" role="status">{message}</p>}
  <div className="adp-admin-payout-list">{rows.map(row=><article className="adp-admin-payout-card" key={row.id}>
   <div className="adp-admin-payout-head"><div><small>{new Date(row.createdAt).toLocaleString('en-BD',{timeZone:'Asia/Dhaka'})}</small><h3>{row.merchant}</h3><strong>{currency(row.amount)}</strong></div><span className={'adp-settlement-status '+row.status.toLowerCase()}>{row.status}</span></div>
   <div className="adp-admin-payout-details"><span>Payout method: <strong>{row.method||'Not specified'}</strong></span><span>Receiving account: <strong>{row.account||'Not provided'}</strong></span>{row.bankName&&<span>Bank: <strong>{row.bankName}</strong></span>}</div>
   {row.reference&&<p className="adp-pay-hint">Transfer reference: {row.reference}</p>}{row.reviewNote&&<p className="adp-pay-hint">Review note: {row.reviewNote}</p>}
   {(row.status==='PENDING'||row.status==='APPROVED')&&<div className="adp-admin-payout-actions"><label>Review note / rejection reason<textarea maxLength={500} value={notes[row.id]||''} onChange={e=>setNotes(s=>({...s,[row.id]:e.target.value}))} placeholder="Explain a rejected request"/></label>
    {row.status==='APPROVED'&&<label>Actual transfer reference<input maxLength={100} value={refs[row.id]||''} onChange={e=>setRefs(s=>({...s,[row.id]:e.target.value}))} placeholder="Payment transaction/reference ID"/></label>}
    <div>{row.status==='PENDING'&&<button type="button" className="btn" disabled={busy!==null} onClick={()=>act(row,'APPROVE')}>Approve</button>}{row.status==='APPROVED'&&<button type="button" className="btn" disabled={busy!==null} onClick={()=>act(row,'PAID')}>Confirm transfer paid</button>}<button type="button" className="btn secondary" disabled={busy!==null} onClick={()=>act(row,'REJECT')}>Reject request</button></div>
   </div>}
  </article>)}</div>
  {!rows.length&&<div className="admin-empty"><h3>No payout requests yet</h3><p>Merchant requests will appear after they have COD-confirmed delivered earnings.</p></div>}
 </div>;
}
