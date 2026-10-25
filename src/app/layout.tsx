import type {Metadata} from 'next';
import './globals.css';
import {getBranding,getPublicBrandAssets} from '@/lib/site-branding';
import {currentUser} from '@/lib/auth';
import SiteNavigation from '@/components/site-navigation';
import SiteFooter from '@/components/site-footer';
export const dynamic='force-dynamic';
export async function generateMetadata():Promise<Metadata>{
 const brand=await getBranding();
 const logo=(await getPublicBrandAssets()).find(a=>a.kind==='LOGO');
 return {title:brand.brandName+' | Food delivery in Alamdanga',description:brand.description,icons:logo?{icon:'/api/media/branding/'+logo.id}:undefined};
}
export default async function RootLayout({children}:{children:React.ReactNode}){
 const [brand,assets,user]=await Promise.all([getBranding(),getPublicBrandAssets(),currentUser()]);
 const logoId=assets.find(a=>a.kind==='LOGO')?.id;
 const accountHref=!user?'/login':user.role==='ADMIN'?'/admin':user.role==='RIDER'?'/rider':user.role==='MERCHANT'?'/merchant':'/orders';
 return <html lang="en"><body>
  <SiteNavigation brandName={brand.brandName} logoId={logoId} accountName={user?.name?.split(' ')[0]} accountHref={accountHref}/>
  {children}
  <SiteFooter brandName={brand.brandName} logoId={logoId} description={brand.footerDescription} note={brand.footerNote}/>
 </body></html>;
}
