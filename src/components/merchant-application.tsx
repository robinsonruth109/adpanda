'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import KitchenMapPicker from './kitchen-map-picker';
import {storeTypeContent,type MarketplaceType} from '@/lib/store-types';
export default function MerchantApplication(){
 const router=useRouter();
 const [confirmed,setConfirmed]=useState(false);
 const [storeType,setStoreType]=useState<MarketplaceType>('FOOD');
 const kind=storeTypeContent[storeType];
 const [kitchenName,setKitchenName]=useState(''),[address,setAddress]=useState(''),[latitude,setLatitude]=useState(''),[longitude,setLongitude]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 function locate(){if(!navigator.geolocation){setMessage('Location not supported by this browser');return;}navigator.geolocation.getCurrentPosition(p=>{setLatitude(String(p.coords.latitude));setLongitude(String(p.coords.longitude));setConfirmed(false);setMessage('Location detected. Verify it matches your fixed kitchen location before submitting.');},()=>setMessage('Location permission denied. Enter coordinates manually.'),{enableHighAccuracy:true,timeout:12000});}
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(!confirmed){setMessage('Confirm the precise entrance pin before submitting.');return;}setBusy(true);setMessage('');try{const response=await fetch('/api/merchant/apply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kitchenName,storeType,address,latitude:Number(latitude),longitude:Number(longitude)})});const payload=await response.json();if(!response.ok)throw Error(payload.error||'Could not apply');setMessage('Application submitted. Status: PENDING. Our admin will review your shop type and entrance location.');router.refresh();}catch(e){setMessage(e instanceof Error?e.message:'Submission failed')}finally{setBusy(false)}}
 return <form onSubmit={submit} className="panel" style={{display:'grid',gap:14,maxWidth:650}}>
 <h2>Register your shop / দোকান নিবন্ধন</h2><p className="muted">Food, Grocery বা Stationery নির্বাচন করুন। Admin approval ও exact pickup pin verification প্রয়োজন।</p>
 <div className="merchant-store-type-picker" role="group" aria-label="Choose your shop category">{(['FOOD','GROCERY','STATIONERY'] as const).map(t=><button type="button" key={t} aria-pressed={storeType===t} onClick={()=>{setStoreType(t);setConfirmed(false)}} className={storeType===t?'selected':''}><span>{storeTypeContent[t].emoji}</span><strong>{storeTypeContent[t].name}</strong><small>{storeTypeContent[t].bn}</small></button>)}</div>
 <label>{kind.singular} name / দোকানের নাম<input required minLength={3} maxLength={120} value={kitchenName} onChange={e=>setKitchenName(e.target.value)} style={{display:'block',width:'100%',padding:12,marginTop:8}}/></label>
 <label>Full shop address / দোকানের সম্পূর্ণ ঠিকানা<textarea required minLength={8} maxLength={500} value={address} onChange={e=>setAddress(e.target.value)} style={{display:'block',width:'100%',minHeight:90,padding:12,marginTop:8}}/></label>
 <button type="button" className="btn secondary" onClick={locate}>📍 Shop / Pickup point GPS</button>
 <div className="flex"><label>Latitude<input required type="number" step="any" min="-90" max="90" value={latitude} onChange={e=>{setLatitude(e.target.value);setConfirmed(false)}} style={{width:'100%',padding:12}}/></label><label>Longitude<input required type="number" step="any" min="-180" max="180" value={longitude} onChange={e=>{setLongitude(e.target.value);setConfirmed(false)}} style={{width:'100%',padding:12}}/></label></div>
 <KitchenMapPicker latitude={latitude} longitude={longitude} onChange={(a,b)=>{setLatitude(a);setLongitude(b);setConfirmed(false)}}/>
 <label style={{display:"flex",alignItems:"center",gap:10}}><input type="checkbox" required checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>এই Pin দোকানের আসল প্রবেশপথে বসানো হয়েছে / Confirm shop entrance</label>
 {message&&<p role="status">{message}</p>}<button disabled={busy} className="btn">{busy?'Submitting...':'Submit '+kind.singular+' for approval'}</button></form>
}
