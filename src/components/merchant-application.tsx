'use client';
import {useState} from 'react';
export default function MerchantApplication(){
 const [kitchenName,setKitchenName]=useState(''),[address,setAddress]=useState(''),[latitude,setLatitude]=useState(''),[longitude,setLongitude]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 function locate(){if(!navigator.geolocation){setMessage('Location not supported by this browser');return;}navigator.geolocation.getCurrentPosition(p=>{setLatitude(String(p.coords.latitude));setLongitude(String(p.coords.longitude));setMessage('Location detected. Verify it matches your fixed kitchen location before submitting.');},()=>setMessage('Location permission denied. Enter coordinates manually.'),{enableHighAccuracy:true,timeout:12000});}
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setMessage('');try{const response=await fetch('/api/merchant/apply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kitchenName,address,latitude:Number(latitude),longitude:Number(longitude)})});const payload=await response.json();if(!response.ok)throw Error(payload.error||'Could not apply');setMessage('Application submitted. Status: PENDING. Our admin will review your fixed location.');}catch(e){setMessage(e instanceof Error?e.message:'Submission failed')}finally{setBusy(false)}}
 return <form onSubmit={submit} className="panel" style={{display:'grid',gap:14,maxWidth:650}}>
 <h2>Register your cloud kitchen</h2><p className="muted">Applications require admin approval. Kitchen coordinates become fixed after verification.</p>
 <label>Kitchen name<input required minLength={3} maxLength={120} value={kitchenName} onChange={e=>setKitchenName(e.target.value)} style={{display:'block',width:'100%',padding:12,marginTop:8}}/></label>
 <label>Full kitchen address<textarea required minLength={8} maxLength={500} value={address} onChange={e=>setAddress(e.target.value)} style={{display:'block',width:'100%',minHeight:90,padding:12,marginTop:8}}/></label>
 <button type="button" className="btn secondary" onClick={locate}>📍 Use my kitchen's current location</button>
 <div className="flex"><label>Latitude<input required type="number" step="any" min="-90" max="90" value={latitude} onChange={e=>setLatitude(e.target.value)} style={{width:'100%',padding:12}}/></label><label>Longitude<input required type="number" step="any" min="-180" max="180" value={longitude} onChange={e=>setLongitude(e.target.value)} style={{width:'100%',padding:12}}/></label></div>
 {message&&<p role="status">{message}</p>}<button disabled={busy} className="btn">{busy?'Submitting...':'Submit kitchen for approval'}</button></form>
}
