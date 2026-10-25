'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {ImagePlus,Trash2,Save,Upload,Eye,EyeOff,MoveUp,MoveDown} from 'lucide-react';
export type Asset={id:string;kind:string;title:string|null;subtitle:string|null;ctaLabel:string|null;href:string|null;sortOrder:number;active:boolean};
const defaultMeta={title:'',subtitle:'',ctaLabel:'Explore now',href:'/kitchens'};
export default function BrandMediaManager({initial}:{initial:Asset[]}){
 const router=useRouter();
 const [assets,setAssets]=useState(initial),[kind,setKind]=useState<'LOGO'|'HERO'|'PROMO'>('HERO'),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState('');
 const [meta,setMeta]=useState(defaultMeta),[editing,setEditing]=useState<Record<string,Asset>>({}),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>{setAssets(initial)},[initial]);
 useEffect(()=>{if(!file){setPreview('');return}const u=URL.createObjectURL(file);setPreview(u);return()=>URL.revokeObjectURL(u)},[file]);
 function selectedFile(f:File|null){
  setNotice('');
  if(f&&!['image/jpeg','image/png','image/webp'].includes(f.type)){setNotice('Only JPG, PNG and WebP are allowed');return}
  if(f&&f.size>5*1024*1024){setNotice('Maximum image size is 5 MB');return}
  setFile(f);
 }
 async function upload(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!file||busy)return;
  setBusy(true);setNotice('');
  try{
   const data=new FormData();data.append('image',file);data.append('kind',kind);
   if(kind!=='LOGO')Object.entries(meta).forEach(([key,val])=>data.append(key,val));
   const res=await fetch('/api/admin/branding/assets',{method:'POST',body:data});
   const result=await res.json();if(!res.ok)throw Error(result.error||'Upload failed');
   setFile(null);setMeta(defaultMeta);setNotice(kind+' image uploaded and published to the site.');router.refresh();
  }catch(err){setNotice(err instanceof Error?err.message:'Upload failed')}finally{setBusy(false)}
 }
 function draft(a:Asset){return editing[a.id]||a}
 function change(a:Asset,update:Partial<Asset>){setEditing(v=>({...v,[a.id]:{...draft(a),...update}}))}
 async function save(a:Asset,override?:Partial<Asset>){
  if(busy)return;const current={...draft(a),...override};setBusy(true);setNotice('');
  try{
   const res=await fetch('/api/admin/branding/assets/'+encodeURIComponent(a.id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:current.title||null,subtitle:current.subtitle||null,ctaLabel:current.ctaLabel||null,href:current.href||'/kitchens',sortOrder:current.sortOrder,active:current.active})});
   const data=await res.json();if(!res.ok)throw Error(data.error||'Save failed');
   setAssets(v=>v.map(x=>x.id===a.id?current:x));setEditing(v=>{const copy={...v};delete copy[a.id];return copy});setNotice('Banner details updated.');router.refresh();
  }catch(err){setNotice(err instanceof Error?err.message:'Unable to save banner')}finally{setBusy(false)}
 }
 async function remove(a:Asset){
  if(busy||!window.confirm('Delete this '+a.kind.toLowerCase()+' image? It will disappear from the public website.'))return;
  setBusy(true);setNotice('');
  try{
   const res=await fetch('/api/admin/branding/assets/'+encodeURIComponent(a.id),{method:'DELETE'});
   const data=await res.json();if(!res.ok)throw Error(data.error||'Delete failed');
   setAssets(v=>v.filter(x=>x.id!==a.id));setNotice('Image removed from branding.');router.refresh();
  }catch(err){setNotice(err instanceof Error?err.message:'Delete failed')}finally{setBusy(false)}
 }
 const grouped=['LOGO','HERO','PROMO'];
 return <section className="brand-media-manager">
  <div className="brand-editor-heading"><div><h2>Logo & banner library</h2><p>All images are securely stored in Railway bucket. Admin controls display order and visibility.</p></div></div>
  {notice&&<p className="brand-notice" role="status">{notice}</p>}
  <form className="brand-upload" onSubmit={upload}>
   <div><h3>Upload a new asset</h3><p>Recommended: logo 1:1, hero 16:9, promo 2.8:1. Up to 5 MB.</p></div>
   <div className="brand-upload-grid"><label>Placement<select value={kind} onChange={e=>setKind(e.target.value as 'LOGO'|'HERO'|'PROMO')}><option value="LOGO">Site logo (replaces existing)</option><option value="HERO">Homepage hero slide (max 6)</option><option value="PROMO">Promotional banner (max 18)</option></select></label>
    <label className="brand-file-label"><ImagePlus size={18}/>{file?file.name:'Choose an image'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>selectedFile(e.target.files?.[0]||null)}/></label></div>
   {preview&&<img className="brand-upload-preview" src={preview} alt="Selected banner preview"/>}
   {kind!=='LOGO'&&<div className="brand-upload-meta">{([['title','Title'],['subtitle','Subtitle'],['ctaLabel','Button label'],['href','Button link']] as const).map(([key,label])=><label key={key}>{label}<input value={meta[key]} onChange={e=>setMeta(v=>({...v,[key]:e.target.value}))} maxLength={key==='subtitle'?300:key==='title'?140:key==='href'?200:50}/></label>)}</div>}
   <button type="submit" className="brand-primary" disabled={!file||busy}><Upload size={16}/>{busy?'Uploading…':'Upload to Railway bucket'}</button>
  </form>
  {grouped.map(type=><div className="brand-asset-group" key={type}>
   <div className="brand-asset-head"><h3>{type==='LOGO'?'Site logo':type==='HERO'?'Homepage hero slides':'Promotional banners'}</h3><span>{assets.filter(a=>a.kind===type).length}</span></div>
   <div className="brand-asset-grid">{assets.filter(a=>a.kind===type).sort((a,b)=>a.sortOrder-b.sortOrder).map(a=><article className="brand-asset-card" key={a.id}>
    <img src={'/api/media/branding/'+encodeURIComponent(a.id)} alt={a.title||type+' asset'} loading="lazy"/>
    <div className="brand-asset-card-body"><div className="brand-asset-topline"><strong>{a.title||type+' image'}</strong><span>{draft(a).active?'Visible':'Hidden'}</span></div>
     {type!=='LOGO'&&<div className="brand-asset-edit">
      <label>Title<input value={draft(a).title||''} onChange={e=>change(a,{title:e.target.value})}/></label>
      <label>Subtitle<input value={draft(a).subtitle||''} onChange={e=>change(a,{subtitle:e.target.value})}/></label>
      <div className="brand-asset-edit-cols"><label>Button<input value={draft(a).ctaLabel||''} onChange={e=>change(a,{ctaLabel:e.target.value})}/></label><label>Link<input value={draft(a).href||'/kitchens'} onChange={e=>change(a,{href:e.target.value})}/></label></div>
      <div className="brand-asset-actions"><button type="button" onClick={()=>save(a,{active:!draft(a).active})} disabled={busy}>{draft(a).active?<EyeOff size={15}/>:<Eye size={15}/>} {draft(a).active?'Hide':'Show'}</button>
      <button type="button" disabled={busy} onClick={()=>save(a,{sortOrder:Math.max(0,draft(a).sortOrder-1)})}><MoveUp size={15}/></button>
      <button type="button" disabled={busy} onClick={()=>save(a,{sortOrder:draft(a).sortOrder+1})}><MoveDown size={15}/></button>
      <button type="button" className="brand-save-mini" disabled={busy} onClick={()=>save(a)}><Save size={15}/> Save</button></div>
     </div>}
     <button type="button" className="brand-delete-mini" disabled={busy} onClick={()=>remove(a)}><Trash2 size={15}/> Remove asset</button>
    </div>
   </article>)}</div>
   {assets.filter(a=>a.kind===type).length===0&&<p className="brand-asset-empty">No {type.toLowerCase()} uploaded yet. Website uses the AdPanda default layout.</p>}
  </div>)}
 </section>;
}
