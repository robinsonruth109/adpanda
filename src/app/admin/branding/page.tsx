import {db} from '@/lib/db';
import {getBranding} from '@/lib/site-branding';
import AdminBrandContentEditor from '@/components/admin-brand-content-editor';
import AdminBrandMediaManager from '@/components/admin-brand-media-manager';
import {Palette,ExternalLink} from 'lucide-react';
import Link from 'next/link';
export const dynamic='force-dynamic';
export default async function AdminBranding(){
 const [branding,assets]=await Promise.all([
  getBranding(),
  db.brandAsset.findMany({orderBy:[{kind:'asc'},{sortOrder:'asc'},{createdAt:'asc'}]})
 ]);
 return <section className="admin-branding-page">
  <div className="brand-admin-intro"><div><span className="admin-overline">BRAND EXPERIENCE</span><h1>Branding & content</h1><p>Manage the public AdPanda storefront without editing code. Updates appear on the homepage, header and footer.</p></div><Link className="brand-preview-link" href="/" target="_blank"><ExternalLink size={17}/> Visit customer website</Link></div>
  <div className="brand-admin-stats">{[['Brand assets',assets.length],['Hero slides',assets.filter(a=>a.kind==='HERO'&&a.active).length],['Promo banners',assets.filter(a=>a.kind==='PROMO'&&a.active).length],['Site logo',assets.some(a=>a.kind==='LOGO')?'Uploaded':'Default']].map(([label,value])=><div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
  <div className="brand-admin-layout"><AdminBrandContentEditor initial={branding}/><AdminBrandMediaManager initial={assets.map(a=>({id:a.id,kind:a.kind,title:a.title,subtitle:a.subtitle,ctaLabel:a.ctaLabel,href:a.href,sortOrder:a.sortOrder,active:a.active}))}/></div>
 </section>;
}
