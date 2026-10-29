'use client';
import {useEffect,useState} from 'react';
import {ImagePlus,Trash2,UploadCloud,UtensilsCrossed} from 'lucide-react';

const MAX_BYTES=3*1024*1024;
const validTypes=['image/jpeg','image/png','image/webp'];
export function menuImageUrl(id:string,version:number){
 return '/api/media/menu/'+encodeURIComponent(id)+'?v='+version;
}
function useLocalPreview(file:File|null){
 const [url,setUrl]=useState('');
 useEffect(()=>{
  if(!file){setUrl('');return}
  const object=URL.createObjectURL(file);
  setUrl(object);
  return()=>URL.revokeObjectURL(object);
 },[file]);
 return url;
}
export function MenuImageUpload({itemId,hasImage,imageVersion,onChanged}:{itemId:string;hasImage:boolean;imageVersion:number;onChanged:(hasImage:boolean,version:number)=>void}){
 const [file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const preview=useLocalPreview(file);
 function choose(selected:File|null){
  setError('');setMessage('');
  if(!selected){setFile(null);return}
  if(!validTypes.includes(selected.type)){setError('Use JPG, PNG or WebP');return}
  if(selected.size>MAX_BYTES||!selected.size){setError('Image must be under 3 MB');return}
  setFile(selected);
 }
 async function upload(){
  if(!file||busy)return;setBusy(true);setError('');setMessage('');
  try{
   const body=new FormData();body.append('image',file);
   const response=await fetch('/api/merchant/menu/'+encodeURIComponent(itemId)+'/image',{method:'POST',body,credentials:'same-origin'});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'Upload failed');
   onChanged(true,result.imageVersion);setFile(null);setMessage('Image saved to Railway bucket');
  }catch(e){setError(e instanceof Error?e.message:'Could not upload image')}finally{setBusy(false)}
 }
 async function remove(){
  if(!hasImage||busy||!window.confirm('Remove this food image from the kitchen menu?'))return;
  setBusy(true);setError('');setMessage('');
  try{
   const response=await fetch('/api/merchant/menu/'+encodeURIComponent(itemId)+'/image',{method:'DELETE',credentials:'same-origin'});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'Removal failed');
   onChanged(false,result.imageVersion);setFile(null);setMessage('Image removed');
  }catch(e){setError(e instanceof Error?e.message:'Could not remove image')}finally{setBusy(false)}
 }
 return <div className="merchant-image-control">
  <div className="merchant-food-icon merchant-food-photo">
   {preview?<img src={preview} alt="New food image preview"/>:hasImage?<img src={menuImageUrl(itemId,imageVersion)} alt="Food item thumbnail" loading="lazy"/>:<UtensilsCrossed size={27}/>}
  </div>
  <div className="merchant-image-actions">
   <label className="merchant-image-pick">
    <ImagePlus size={15}/>{hasImage?'Replace image':'Add image'}
    <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>choose(e.target.files?.[0]||null)} aria-label="Choose JPG, PNG or WebP food photo"/>
   </label>
   {file&&<button type="button" onClick={upload} disabled={busy}><UploadCloud size={15}/>{busy?'Uploading…':'Save image'}</button>}
   {hasImage&&<button type="button" className="danger" onClick={remove} disabled={busy}><Trash2 size={15}/> Remove</button>}
  </div>
  {error&&<p className="merchant-image-feedback error" role="alert">{error}</p>}
  {message&&<p className="merchant-image-feedback" role="status">{message}</p>}
 </div>;
}
export function NewFoodImagePicker({file,onChange}:{file:File|null;onChange:(file:File|null)=>void}){
 const [error,setError]=useState('');
 const preview=useLocalPreview(file);
 function choose(selected:File|null){
  setError('');
  if(!selected){onChange(null);return}
  if(!validTypes.includes(selected.type)){setError('Select JPG, PNG or WebP');return}
  if(selected.size>MAX_BYTES||!selected.size){setError('Image must be under 3 MB');return}
  onChange(selected);
 }
 return <div className="merchant-new-food-image">
  <div className="merchant-new-food-image-preview">{preview?<img src={preview} alt="Selected food preview"/>:<ImagePlus size={38}/>}</div>
  <div><strong>Food image</strong><small>JPG, PNG or WebP • Max 3 MB • Stored in your Railway bucket</small>
   <label className="merchant-image-pick"><UploadCloud size={16}/>{file?'Change photo':'Choose food photo'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>choose(e.target.files?.[0]||null)}/></label>
   {file&&<button type="button" className="merchant-image-remove-pending" onClick={()=>onChange(null)}>Clear selection</button>}
   {error&&<p className="merchant-image-feedback error" role="alert">{error}</p>}
  </div>
 </div>;
}
