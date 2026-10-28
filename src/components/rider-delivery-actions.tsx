'use client';
import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Camera,ImagePlus,CheckCircle2,AlertTriangle,UploadCloud,Wallet} from 'lucide-react';

function PhotoPicker({label,file,onPick}:{label:string;file:File|null;onPick:(file:File|null)=>void}){
 const camera=useRef<HTMLInputElement>(null),gallery=useRef<HTMLInputElement>(null);
 return <div className="rd-photo-picker">
  <div className="rd-photo-title"><Camera size={18}/><strong>{label}</strong><span>Required</span></div>
  <div className="rd-photo-buttons">
   <button type="button" onClick={()=>camera.current?.click()}><Camera size={18}/> Open camera</button>
   <button type="button" onClick={()=>gallery.current?.click()}><ImagePlus size={18}/> Choose file</button>
  </div>
  <input ref={camera} className="rd-visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e=>onPick(e.target.files?.[0]||null)}/>
  <input ref={gallery} className="rd-visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>onPick(e.target.files?.[0]||null)}/>
  {file&&<div className="rd-photo-selected"><CheckCircle2 size={17}/><span>{file.name} · {(file.size/1024/1024).toFixed(2)} MB</span><button type="button" onClick={()=>onPick(null)}>Remove</button></div>}
 </div>;
}
export default function RiderDeliveryActions({orderId,status,merchantPayable,codTotal,deliveryCharge,settlement}:{orderId:string;status:string;merchantPayable:number;codTotal:number;deliveryCharge:number;settlement:string}){
 const router=useRouter();
 const [photo,setPhoto]=useState<File|null>(null),[proof,setProof]=useState<File|null>(null);
 const [method,setMethod]=useState('BKASH'),[reason,setReason]=useState(''),[showRefusal,setShowRefusal]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function send(path:string,body:FormData|object){
  if(busy)return;setBusy(true);setError('');
  try{
   const form=body instanceof FormData;
   const response=await fetch('/api/rider/orders/'+encodeURIComponent(orderId)+'/'+path,{method:'POST',headers:form?undefined:{'Content-Type':'application/json'},body:form?body:JSON.stringify(body)});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(result.error||'Action failed');
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:'Action failed')}finally{setBusy(false)}
 }
 const active=['PICKED_UP','OUT_FOR_DELIVERY'].includes(status);
 return <div className="rd-handover-actions">
 {active&&<section className="rd-action-panel">
  <div className="rd-action-header"><div className="rd-action-icon"><CheckCircle2 size={21}/></div><div><h3>Customer handover</h3><p>Hand over the parcel, collect full COD, then upload a clear handover photo.</p></div></div>
  <PhotoPicker label="Customer handover photo" file={photo} onPick={setPhoto}/>
  <button className="rd-action-primary" type="button" disabled={!photo||busy} onClick={()=>{if(!photo||!window.confirm('Confirm the parcel was handed to the customer and full COD was collected?'))return;const form=new FormData();form.append('handoverPhoto',photo);void send('handover',form)}}><CheckCircle2 size={19}/>{busy?'Saving delivery…':'Confirm parcel handover & COD'}</button>
  <div className="rd-refusal-area"><button type="button" className="rd-refusal-toggle" onClick={()=>setShowRefusal(v=>!v)} aria-expanded={showRefusal}><AlertTriangle size={18}/> Customer refused parcel? <span>{showRefusal?'Hide':'Report refusal'}</span></button>
  {showRefusal&&<div className="rd-refusal-details"><label htmlFor={'refusal-'+orderId}>Reason for refusal</label><textarea id={'refusal-'+orderId} value={reason} onChange={e=>setReason(e.target.value)} rows={3} placeholder="Explain why the customer refused the parcel"/><button className="rd-refusal-submit" type="button" disabled={busy||reason.trim().length<5} onClick={()=>{if(window.confirm('Confirm customer refused this parcel? Return to merchant will be required.'))void send('refuse',{reason})}}>Submit customer refusal</button></div>}</div>
 </section>}
 {status==='DELIVERED'&&settlement!=='CLEARED'&&settlement!=='SUBMITTED'&&<section className="rd-action-panel"><div className="rd-action-header"><div className="rd-action-icon"><Wallet size={21}/></div><div><h3>Settle merchant payment</h3><p>Customer COD: ৳{codTotal.toFixed(2)} · Delivery charge retained: ৳{deliveryCharge.toFixed(2)} · Pay merchant: <strong>৳{merchantPayable.toFixed(2)}</strong> · Merchant must verify payment before clearance.</p></div></div><div className="rd-merchant-pay-hero"><span>PAY TO MERCHANT</span><strong>৳{merchantPayable.toFixed(2)}</strong><small>COD ৳{codTotal.toFixed(2)} − delivery charge ৳{deliveryCharge.toFixed(2)}</small></div><label className="rd-method-label">Payment method<select value={method} onChange={e=>setMethod(e.target.value)}><option value="BKASH">bKash transfer</option><option value="CASH">Cash handover</option></select></label><PhotoPicker label={method==='BKASH'?'bKash transaction screenshot':'Cash handover photo'} file={proof} onPick={setProof}/><button className="rd-action-primary" disabled={!proof||busy} onClick={()=>{if(!proof)return;const form=new FormData();form.append('method',method);form.append('proof',proof);void send('settlement',form)}}><UploadCloud size={18}/>{busy?'Uploading proof…':'Submit payment proof'}</button></section>}
 {status==='DELIVERED'&&settlement==='SUBMITTED'&&<p className="rd-settlement-note">Payment evidence submitted. Awaiting merchant confirmation.</p>}
 {status==='DELIVERED'&&settlement==='CLEARED'&&<p className="rd-settlement-note">Merchant payment verified · settlement cleared.</p>}
 {status==='FAILED'&&<p className="rd-settlement-note">Customer refused delivery. Parcel return handling required.</p>}
 {error&&<p className="rd-action-error" role="alert">{error}</p>}
 </div>;
}
