'use client';
import {useRef,useState} from 'react';
import {Camera,ImagePlus,PackageCheck,CheckCircle2} from 'lucide-react';
import {useRouter} from 'next/navigation';
function PhotoInput({title,value,onChange}:{title:string;value:File|null;onChange:(file:File|null)=>void}){
 const camera=useRef<HTMLInputElement>(null),gallery=useRef<HTMLInputElement>(null);
 return <div className="merchant-dispatch-photo"><strong>{title}</strong><div className="merchant-dispatch-pickers">
 <button type="button" onClick={()=>camera.current?.click()}><Camera size={17}/> Open Camera</button>
 <button type="button" onClick={()=>gallery.current?.click()}><ImagePlus size={17}/> Choose File</button></div>
 <input ref={camera} className="merchant-dispatch-hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e=>onChange(e.target.files?.[0]||null)}/>
 <input ref={gallery} className="merchant-dispatch-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>onChange(e.target.files?.[0]||null)}/>
 {value&&<div className="merchant-dispatch-selected"><CheckCircle2 size={16}/><span>{value.name} · {(value.size/1024/1024).toFixed(2)} MB</span><button type="button" onClick={()=>onChange(null)}>Remove</button></div>}
 </div>;
}
export default function MerchantDispatchProof({orderId}:{orderId:string}){
 const router=useRouter();
 const [parcel,setParcel]=useState<File|null>(null),[handover,setHandover]=useState<File|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(){
  if(!parcel||!handover||busy)return;
  if(!window.confirm('Confirm the parcel was handed to the assigned rider and both photos show this handover?'))return;
  setBusy(true);setError('');
  try{
   const form=new FormData();form.append('parcelPhoto',parcel);form.append('handoverPhoto',handover);
   const response=await fetch('/api/merchant/orders/'+encodeURIComponent(orderId)+'/dispatch',{method:'POST',body:form,credentials:'same-origin'});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(result.error||'Dispatch failed');
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:'Dispatch failed')}finally{setBusy(false)}
 }
 return <section className="merchant-dispatch-proof merchant-dispatch-camera">
  <div className="merchant-dispatch-heading"><Camera size={20}/><div><strong>Dispatch parcel · 2 photos required</strong><p>Capture the sealed parcel and the actual rider handover separately.</p></div></div>
  <PhotoInput title="1. Ready parcel photo" value={parcel} onChange={setParcel}/>
  <PhotoInput title="2. Handover to delivery rider" value={handover} onChange={setHandover}/>
  {error&&<p role="alert" className="merchant-dispatch-error">{error}</p>}
  <button type="button" className="merchant-dispatch-submit" disabled={!parcel||!handover||busy} onClick={()=>void submit()}><PackageCheck size={18}/>{busy?'Uploading photos…':'Dispatch & hand over parcel'}</button>
 </section>;
}
