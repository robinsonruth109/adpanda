'use client';
import {useState} from 'react';
import {Camera,PackageCheck} from 'lucide-react';
import {useRouter} from 'next/navigation';
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
 return <div className="merchant-dispatch-proof" style={{padding:'14px',border:'1px solid #f5c3d5',borderRadius:14,marginTop:12,background:'#fff8fa'}}>
  <strong style={{display:'flex',gap:8,alignItems:'center'}}><Camera size={18}/> Dispatch parcel · 2 photos required</strong>
  <p style={{fontSize:12}}>Take a clear photo of the sealed order and a separate photo showing the handover to the assigned rider.</p>
  <label style={{display:'block',marginBottom:10,fontSize:12}}>1. Ready parcel photo<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e=>setParcel(e.target.files?.[0]||null)} style={{display:'block',width:'100%',marginTop:5}}/></label>
  <label style={{display:'block',marginBottom:10,fontSize:12}}>2. Parcel handover to rider<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e=>setHandover(e.target.files?.[0]||null)} style={{display:'block',width:'100%',marginTop:5}}/></label>
  {error&&<p role="alert" style={{color:'#b91c1c',fontSize:12}}>{error}</p>}
  <button type="button" className="btn" disabled={!parcel||!handover||busy} onClick={()=>void submit()}><PackageCheck size={16}/>{busy?'Saving dispatch proof…':'Dispatch & hand over parcel'}</button>
 </div>;
}
