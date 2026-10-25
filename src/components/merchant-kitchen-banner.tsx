'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {ImagePlus,Upload,Trash2} from 'lucide-react';
export default function MerchantKitchenBanner({kitchenId,version,hasBanner,approved}:{kitchenId:string;version:number;hasBanner:boolean;approved:boolean}){
 const router=useRouter();const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[exists,setExists]=useState(hasBanner),[currentVersion,setCurrentVersion]=useState(version),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{if(!file){setPreview('');return}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file]);
 function choose(f:File|null){setMessage('');if(!f){setFile(null);return}if(!['image/jpeg','image/png','image/webp'].includes(f.type)||!f.size||f.size>5*1024*1024){setMessage('Choose JPG, PNG or WebP under 5 MB');return}setFile(f)}
 async function upload(){
  if(!file||busy)return;setBusy(true);setMessage('');
  try{const data=new FormData();data.append('banner',file);const response=await fetch('/api/merchant/kitchens/'+encodeURIComponent(kitchenId)+'/banner',{method:'POST',body:data});const result=await response.json();if(!response.ok)throw Error(result.error||'Upload failed');setExists(true);setCurrentVersion(result.bannerVersion);setFile(null);setMessage('Banner saved to Railway bucket');router.refresh()}catch(error){setMessage(error instanceof Error?error.message:'Upload failed')}finally{setBusy(false)}
 }
 async function remove(){
  if(busy||!exists||!window.confirm('Remove kitchen banner?'))return;setBusy(true);setMessage('');
  try{const response=await fetch('/api/merchant/kitchens/'+encodeURIComponent(kitchenId)+'/banner',{method:'DELETE'});const result=await response.json();if(!response.ok)throw Error(result.error||'Could not remove');setExists(false);setCurrentVersion(result.bannerVersion);setFile(null);setMessage('Banner removed');router.refresh()}catch(error){setMessage(error instanceof Error?error.message:'Remove failed')}finally{setBusy(false)}
 }
 const bannerUrl='/api/media/kitchens/'+encodeURIComponent(kitchenId)+'/banner?v='+currentVersion;
 return <div className="merchant-banner-manager">
  <div className="merchant-banner-preview">{preview?<img src={preview} alt="Kitchen banner preview"/>:exists?<img src={bannerUrl} alt="Current kitchen banner"/>:<div><ImagePlus size={40}/><span>Your kitchen cover photo</span></div>}</div>
  <p>Recommended 1600 × 500 pixels · JPG, PNG, WebP · Maximum 5 MB · Railway bucket storage.</p>
  <div className="merchant-banner-buttons">
   <label className="merchant-primary-button"><ImagePlus size={17}/>{exists?'Replace banner':'Choose banner'}<input type="file" hidden accept="image/jpeg,image/png,image/webp" disabled={!approved||busy} onChange={e=>choose(e.target.files?.[0]||null)}/></label>
   {file&&<button className="merchant-primary-button" type="button" disabled={busy} onClick={upload}><Upload size={16}/>{busy?'Uploading…':'Upload & save'}</button>}
   {exists&&<button type="button" className="merchant-banner-remove" disabled={busy||!approved} onClick={remove}><Trash2 size={16}/> Remove</button>}
  </div>
  {message&&<p role="status" className="merchant-inline-alert">{message}</p>}
 </div>;
}
