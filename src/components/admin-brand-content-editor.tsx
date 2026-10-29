'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Save,Type,PanelTop,Utensils,Store,AlignLeft} from 'lucide-react';
import type {Branding} from '@/lib/site-branding';
const groups=[
 {name:'Brand identity',icon:Type,fields:[['brandName','Brand name']]},
 {name:'Homepage hero',icon:PanelTop,fields:[['homeEyebrow','Small eyebrow'],['headline','Main headline'],['description','Hero description'],['heroButton','Main CTA text'],['heroLink','Main CTA link']]},
 {name:'Kitchen and food sections',icon:Utensils,fields:[['kitchensTitle','Kitchen section heading'],['foodTitle','Food section heading'],['foodDescription','Food section description']]},
 {name:'Merchant call-to-action',icon:Store,fields:[['merchantHeadline','Merchant promotion title'],['merchantDescription','Merchant promotion description']]},
 {name:'Footer',icon:AlignLeft,fields:[['footerDescription','Footer description'],['footerNote','Footer bottom note']]}
] as const;
export default function BrandContentEditor({initial}:{initial:Branding}){
 const router=useRouter();const [values,setValues]=useState(initial),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 async function save(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setNotice('');
  try{
   const res=await fetch('/api/admin/branding',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(values)});
   const data=await res.json();if(!res.ok)throw Error(data.error||'Save failed');
   setNotice('Branding content saved and published to the customer website.');router.refresh();
  }catch(error){setNotice(error instanceof Error?error.message:'Unable to save branding')}finally{setBusy(false)}
 }
 return <form className="brand-editor" onSubmit={save}><div className="brand-editor-heading"><div><h2>Website copy & messaging</h2><p>These fields control the public homepage, header and footer.</p></div><button className="brand-primary" type="submit" disabled={busy}><Save size={17}/>{busy?'Saving…':'Save & publish'}</button></div>
 {notice&&<p className="brand-notice" role="status">{notice}</p>}
 <div className="brand-editor-groups">{groups.map(group=><section className="brand-editor-group" key={group.name}><div className="brand-editor-group-head"><group.icon size={19}/><h3>{group.name}</h3></div><div className="brand-editor-fields">{group.fields.map(([key,label])=><label key={key}><span>{label}</span>{['description','foodDescription','merchantDescription','footerDescription'].includes(key)?<textarea rows={3} value={values[key]} onChange={e=>setValues(v=>({...v,[key]:e.target.value}))}/>:<input type="text" required={key!=='homeEyebrow'&&key!=='footerNote'} value={values[key]} onChange={e=>setValues(v=>({...v,[key]:e.target.value}))}/>}</label>)}</div></section>)}</div>
 <button type="submit" className="brand-primary" disabled={busy}><Save size={17}/>{busy?'Saving…':'Save all website content'}</button>
 </form>;
}
