'use client';
import {useState} from 'react';
import KitchenMapPicker from './kitchen-map-picker';
export default function AdminKitchenPin({id,latitude,longitude}:{id:string;latitude:number;longitude:number}){
 const [lat,setLat]=useState(String(latitude)),[lng,setLng]=useState(String(longitude));
 const [edit,setEdit]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function save(){if(!window.confirm('Have you verified this is the real kitchen entrance?'))return;setBusy(true);setMessage('');try{const r=await fetch('/api/admin/kitchens/'+encodeURIComponent(id)+'/location',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({latitude:Number(lat),longitude:Number(lng)})});const x=await r.json();if(!r.ok)throw Error(x.error||'Location update failed');setMessage('New location saved and audited. Review again before approving.');setEdit(false)}catch(e){setMessage(e instanceof Error?e.message:'Failed')}finally{setBusy(false)}}
 return <div className="admin-pin-editor"><button type="button" className="btn secondary" onClick={()=>setEdit(!edit)}>{edit?'Close map editor':'📍 Correct kitchen pin'}</button>{edit&&<><KitchenMapPicker latitude={lat} longitude={lng} onChange={(a,b)=>{setLat(a);setLng(b)}}/><button type="button" className="btn" onClick={save} disabled={busy||!lat||!lng}>{busy?'Saving...':'Save verified entrance location'}</button></>}{message&&<p role="status">{message}</p>}</div>;
}
