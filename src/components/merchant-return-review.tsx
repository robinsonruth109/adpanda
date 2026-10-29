'use client';
import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Camera,ImagePlus,PackageCheck} from 'lucide-react';
export default function MerchantReturnReview({orderId,returnState}:{orderId:string;returnState:string}){
 const camera=useRef<HTMLInputElement>(null),gallery=useRef<HTMLInputElement>(null);
 const [photo,setPhoto]=useState<File|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const router=useRouter();
 if(returnState==='CLOSED')return <div className="rd-card" style={{background:'#eafbf2',marginTop:14,color:'#086e4c'}}><strong>Return received · order closed</strong><p>No rider delivery fee, no COD collection and no payment transaction.</p></div>;
 return <section className="merchant-dispatch-camera merchant-dispatch-proof" style={{marginTop:14}}>
  <strong>Failed delivery · return to merchant</strong>
  <p>Ask the rider to call you and physically return the parcel. No charge is payable on this failed delivery.</p>
  {returnState!=='SUBMITTED'?<p>Waiting for the rider's parcel return photo. Do not close the order until the parcel is received.</p>:<>
    <strong>Rider return evidence</strong>
    <a href={'/api/orders/'+orderId+'/evidence?type=return-rider'} target="_blank" rel="noopener noreferrer"><img style={{maxWidth:'100%',maxHeight:260,objectFit:'contain',borderRadius:10}} src={'/api/orders/'+orderId+'/evidence?type=return-rider'} alt="Rider return proof"/> View larger proof</a>
    <strong>Merchant receipt photo required</strong>
    <div className="merchant-dispatch-pickers"><button type="button" onClick={()=>camera.current?.click()}><Camera size={17}/> Open Camera</button><button type="button" onClick={()=>gallery.current?.click()}><ImagePlus size={17}/> Choose File</button></div>
    <input ref={camera} className="merchant-dispatch-hidden" type="file" capture="environment" accept="image/jpeg,image/png,image/webp" onChange={e=>setPhoto(e.target.files?.[0]||null)}/>
    <input ref={gallery} className="merchant-dispatch-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setPhoto(e.target.files?.[0]||null)}/>
    {photo&&<small>Selected: {photo.name}</small>}
    <button type="button" className="merchant-dispatch-submit" disabled={!photo||busy} onClick={async()=>{
      if(!photo||busy||!window.confirm('Physically received the returned parcel and verified its condition?'))return;
      setBusy(true);setError('');
      try{const body=new FormData();body.append('receivedPhoto',photo);const r=await fetch('/api/merchant/orders/'+encodeURIComponent(orderId)+'/receive-return',{method:'POST',body});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'Failed to confirm');router.refresh()}catch(e){setError(e instanceof Error?e.message:'Failed')}finally{setBusy(false)}
    }}><PackageCheck size={18}/> {busy?'Saving return…':'Mark return received · close order'}</button>
  </>}
  {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
 </section>;
}
