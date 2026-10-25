'use client';
import {useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {BookOpen,Search,Plus,UtensilsCrossed,SquarePen,Check,Undo2} from 'lucide-react';
import {MenuImageUpload,NewFoodImagePicker} from '@/components/menu-image-upload';
import {storeTypeContent,type MarketplaceType} from '@/lib/store-types';
type Category={id:string;name:string;active:boolean};
type Item={id:string;name:string;description:string;price:number;unitLabel:string;stockQty:number|null;available:boolean;categoryId:string;hasImage:boolean;imageVersion:number};
export default function MerchantMenuWorkspace({kitchens}:{kitchens:{id:string;name:string;storeType:MarketplaceType;approved:boolean;categories:Category[];items:Item[]}[]}){
 const router=useRouter();
 const [kitchenId,setKitchenId]=useState(kitchens[0]?.id||'');
 const [categories,setCategories]=useState<Record<string,Category[]>>({});
 const [items,setItems]=useState<Record<string,Item[]>>({});
 const [categoryId,setCategoryId]=useState('ALL');
 const [search,setSearch]=useState('');
 const [newCategory,setNewCategory]=useState(''),[newName,setNewName]=useState(''),[newDescription,setNewDescription]=useState(''),[newPrice,setNewPrice]=useState(''),[chosenCat,setChosenCat]=useState('');
 const [newUnit,setNewUnit]=useState('piece'),[newStock,setNewStock]=useState('');
 const [newImageFile,setNewImageFile]=useState<File|null>(null);
 const [editing,setEditing]=useState<string|null>(null),[draft,setDraft]=useState({name:'',description:'',price:'',unitLabel:'piece',stockQty:''});
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const kitchen=kitchens.find(k=>k.id===kitchenId);
 const kind=storeTypeContent[kitchen?.storeType||'FOOD'];
 const cats=categories[kitchenId]||kitchen?.categories||[];
 const foods=items[kitchenId]||kitchen?.items||[];
 const selectedCat=cats.find(c=>c.id===chosenCat)||cats[0];
 const shown=useMemo(()=>foods.filter(i=>(categoryId==='ALL'||i.categoryId===categoryId)&&[i.name,i.description].join(' ').toLowerCase().includes(search.toLowerCase())),[foods,categoryId,search]);
 async function addCategory(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy||!kitchen)return;setBusy(true);setNotice('');
  try{const r=await fetch('/api/merchant/categories',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kitchenId,name:newCategory.trim()})});const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to create category');setCategories(v=>({...v,[kitchenId]:[...cats,{id:d.id,name:d.name,active:true}]}));setChosenCat(d.id);setNewCategory('');setNotice('Category created.');router.refresh()}catch(e){setNotice(e instanceof Error?e.message:'Could not create category')}finally{setBusy(false)}
 }
 async function addFood(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy||!kitchen||!selectedCat)return; if(newStock.trim()!==''&&(!Number.isInteger(Number(newStock))||Number(newStock)<0)){setNotice('Stock must be a whole number or blank');return}setBusy(true);setNotice('');
  try{const price=Number(newPrice);if(!Number.isFinite(price)||price<=0)throw Error('Enter a valid price');const r=await fetch('/api/merchant/menu',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kitchenId,categoryName:selectedCat.name,name:newName.trim(),description:newDescription.trim(),price,unitLabel:newUnit.trim()||'piece',stockQty:newStock.trim()===''?null:Number(newStock)})});const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to save food');setItems(v=>({...v,[kitchenId]:[...foods,{id:d.itemId,name:newName.trim(),description:newDescription.trim(),price,unitLabel:newUnit.trim()||'piece',stockQty:newStock.trim()===''?null:Number(newStock),available:true,categoryId:selectedCat.id,hasImage:false,imageVersion:0}]}));
   let imageError='';
   if(newImageFile){
    try{
     const form=new FormData();form.append('image',newImageFile);
     const upload=await fetch('/api/merchant/menu/'+encodeURIComponent(d.itemId)+'/image',{method:'POST',body:form,credentials:'same-origin'});
     const photo=await upload.json();
     if(!upload.ok)throw Error(photo.error||'Image upload failed');
     setItems(v=>({...v,[kitchenId]:(v[kitchenId]||[]).map(i=>i.id===d.itemId?{...i,hasImage:true,imageVersion:photo.imageVersion}:i)}));
    }catch(uploadError){imageError=uploadError instanceof Error?uploadError.message:'Image upload failed'}
   }
   setNewName('');setNewDescription('');setNewPrice('');setNewStock('');setNewUnit('piece');setNewImageFile(null);
   setNotice(imageError?'Food saved, but image upload failed: '+imageError+'. You can retry from the item card.':'Food item and image saved successfully.');
   router.refresh()}catch(e){setNotice(e instanceof Error?e.message:'Could not add item')}finally{setBusy(false)}
 }
 async function modify(food:Item,changes:{available?:boolean;name?:string;description?:string;price?:number;unitLabel?:string;stockQty?:number|null}){
  if(busy)return;setBusy(true);setNotice('');
  try{const r=await fetch('/api/merchant/menu/'+encodeURIComponent(food.id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(changes)});const d=await r.json();if(!r.ok)throw Error(d.error||'Update failed');setItems(v=>({...v,[kitchenId]:foods.map(i=>i.id===food.id?{...i,...changes}:i)}));setEditing(null);setNotice('Menu item updated.');router.refresh()}catch(e){setNotice(e instanceof Error?e.message:'Item update failed')}finally{setBusy(false)}
 }
 return <div className="merchant-menu-workspace">
  <div className="merchant-menu-overview"><div><BookOpen size={24}/><strong>{foods.length}</strong><span>Products</span></div><div><Check size={24}/><strong>{foods.filter(i=>i.available&&(i.stockQty===null||i.stockQty>0)).length}</strong><span>Available</span></div><div><UtensilsCrossed size={24}/><strong>{cats.length}</strong><span>Categories</span></div></div>
  {kitchens.length>1&&<label className="merchant-kitchen-select">Select kitchen<select value={kitchenId} onChange={e=>{setKitchenId(e.target.value);setCategoryId('ALL');setChosenCat('');setEditing(null)}}>{kitchens.map(k=><option key={k.id} value={k.id}>{k.name}</option>)}</select></label>}
  {!kitchen?.approved?<div className="merchant-empty-state">Shop approval is required before creating products.</div>:<>
  {notice&&<div className="merchant-inline-alert" role="status">{notice}</div>}
  <div className="merchant-menu-layout">
   <aside className="merchant-category-panel"><div className="merchant-menu-panel-heading"><h2>Categories</h2><span>{cats.length}</span></div><nav aria-label="Product categories"><button type="button" className={categoryId==='ALL'?'active':''} onClick={()=>setCategoryId('ALL')}>All items <small>{foods.length}</small></button>{cats.map(cat=><button key={cat.id} className={categoryId===cat.id?'active':''} onClick={()=>setCategoryId(cat.id)} type="button">{cat.name}<small>{foods.filter(f=>f.categoryId===cat.id).length}</small></button>)}</nav>
    <form className="merchant-new-category" onSubmit={addCategory}><label htmlFor="merchant-category-name">New category</label><input id="merchant-category-name" required minLength={2} maxLength={80} value={newCategory} onChange={e=>setNewCategory(e.target.value)} placeholder={kind.categoryExamples.slice(0,3).join(', ')}/><button type="submit" disabled={busy}><Plus size={17}/> Create category</button></form>
   </aside>
   <div className="merchant-menu-main"><div className="merchant-menu-search"><Search size={19}/><input aria-label="Search products" placeholder="Search product name or description" value={search} onChange={e=>setSearch(e.target.value)}/></div>
    <div className="merchant-food-list">{shown.map(food=><article className="merchant-food-card" key={food.id}><MenuImageUpload itemId={food.id} hasImage={food.hasImage} imageVersion={food.imageVersion} onChanged={(hasImage,imageVersion)=>setItems(v=>({...v,[kitchenId]:(v[kitchenId]||foods).map(i=>i.id===food.id?{...i,hasImage,imageVersion}:i)}))}/><div className="merchant-food-info"><div className="merchant-food-title"><h3>{food.name}</h3><span className={'merchant-status-chip '+(food.available?'open':'closed')}>{food.available&&(food.stockQty===null||food.stockQty>0)?'Available':'Sold out'}</span></div><p>{food.description||'No description yet'}</p><strong>৳{food.price.toFixed(2)} / {food.unitLabel}</strong><small style={{display:'block',marginTop:5}}>Stock: {food.stockQty===null?'Untracked':food.stockQty+' units'}</small><div className="merchant-food-card-actions"><button type="button" disabled={busy} onClick={()=>{setEditing(food.id);setDraft({name:food.name,description:food.description,price:String(food.price),unitLabel:food.unitLabel,stockQty:food.stockQty===null?'':String(food.stockQty)})}}><SquarePen size={16}/> Edit</button><button type="button" disabled={busy} onClick={()=>modify(food,{available:!food.available})}>{food.available?'Mark sold out':'Make available'}</button></div>
     {editing===food.id&&<form className="merchant-item-edit" onSubmit={e=>{e.preventDefault();modify(food,{name:draft.name.trim(),description:draft.description.trim(),price:Number(draft.price),unitLabel:draft.unitLabel.trim()||'piece',stockQty:draft.stockQty.trim()===''?null:Number(draft.stockQty)})}}><label>Product name<input minLength={2} maxLength={150} required value={draft.name} onChange={e=>setDraft(v=>({...v,name:e.target.value}))}/></label><label>Description<textarea maxLength={2000} value={draft.description} onChange={e=>setDraft(v=>({...v,description:e.target.value}))}/></label><label>Price (৳)<input type="number" required min=".01" step=".01" value={draft.price} onChange={e=>setDraft(v=>({...v,price:e.target.value}))}/></label><label>Sale unit<input maxLength={32} required value={draft.unitLabel} onChange={e=>setDraft(v=>({...v,unitLabel:e.target.value}))}/></label><label>Stock quantity (blank = untracked)<input type="number" min="0" step="1" value={draft.stockQty} onChange={e=>setDraft(v=>({...v,stockQty:e.target.value}))}/></label><div><button type="submit" disabled={busy}>Save changes</button><button type="button" onClick={()=>setEditing(null)}><Undo2 size={15}/> Cancel</button></div></form>}
    </div></article>)}</div>
    {!shown.length&&<div className="merchant-empty-state"><UtensilsCrossed size={36}/><h3>No products found</h3><p>Add a product or change the category.</p></div>}
   </div>
  </div>
  <section className="merchant-add-item-card" id="add-item"><div className="merchant-menu-panel-heading"><div><span className="merchant-kicker">EXPAND YOUR MENU</span><h2>Add new {kind.singular==='Kitchen'?'food item':'product'}</h2></div><Plus size={24}/></div>
   {cats.length===0?<p>Create a category first to add your first item.</p>:<form onSubmit={addFood}><NewFoodImagePicker file={newImageFile} onChange={setNewImageFile}/><div className="merchant-menu-form-grid"><label>Category<select value={selectedCat?.id||''} onChange={e=>setChosenCat(e.target.value)} required>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Product name<input placeholder={kitchen?.storeType==='GROCERY'?'e.g. মিনিকেট চাল 1 kg':kitchen?.storeType==='STATIONERY'?'e.g. A4 Notebook 200 pages':'e.g. Chicken Momo (6 pcs)'} minLength={2} maxLength={150} required value={newName} onChange={e=>setNewName(e.target.value)}/></label><label>Price (৳)<input type="number" min=".01" step=".01" required placeholder="0.00" value={newPrice} onChange={e=>setNewPrice(e.target.value)}/></label><label>Sale unit / প্যাকের ধরন<input type="text" maxLength={32} required placeholder="piece, pack, 500 g, 1 kg" value={newUnit} onChange={e=>setNewUnit(e.target.value)}/></label><label>Available stock / মজুদ (optional)<input type="number" min="0" step="1" placeholder="Blank = untracked" value={newStock} onChange={e=>setNewStock(e.target.value)}/></label><label className="merchant-menu-full">Description<textarea rows={3} placeholder="Describe ingredients, quantity and serving" maxLength={2000} value={newDescription} onChange={e=>setNewDescription(e.target.value)}/></label></div><button className="merchant-primary-button" disabled={busy}><Plus size={17}/> Add product</button></form>}
  </section>
  </>}
 </div>;
}
