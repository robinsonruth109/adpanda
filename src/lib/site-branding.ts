import 'server-only';
import {z} from 'zod';
import {db} from '@/lib/db';
export const BRAND_KEY='site_branding_v1';
export const safeBrandHref=z.string().trim().max(200).refine(s=>s.startsWith('/')&&!s.startsWith('//')&&!s.includes('\\')&&!s.includes('://'),'Use an internal AdPanda link, starting with /');
export const brandSchema=z.object({
 brandName:z.string().trim().min(2).max(48),
 homeEyebrow:z.string().trim().max(70),
 headline:z.string().trim().min(5).max(160),
 description:z.string().trim().max(420),
 heroButton:z.string().trim().min(2).max(45),
 heroLink:safeBrandHref,
 kitchensTitle:z.string().trim().min(2).max(90),
 foodTitle:z.string().trim().min(2).max(90),
 foodDescription:z.string().trim().max(180),
 merchantHeadline:z.string().trim().max(100),
 merchantDescription:z.string().trim().max(220),
 footerDescription:z.string().trim().max(280),
 footerNote:z.string().trim().max(140)
});
export type Branding=z.infer<typeof brandSchema>;
export const defaultBranding:Branding={
 brandName:'AdPanda',
 homeEyebrow:'FRESH FROM YOUR NEIGHBOURHOOD',
 headline:'Food, groceries & essentials. Delivered to your door.',
 description:'Order meals, everyday groceries, stationery and school supplies from trusted local shops in Alamdanga.',
 heroButton:'Explore local shops',
 heroLink:'/kitchens',
 kitchensTitle:'Local shops near you',
 foodTitle:'Products you will love',
 foodDescription:'Browse food, groceries, stationery and essentials from verified local shops.',
 merchantHeadline:'Own a restaurant, grocery or stationery shop?',
 merchantDescription:'Bring your local shop online. Sell food, groceries or stationery with simple COD delivery.',
 footerDescription:'Food, groceries, stationery and everyday essentials from your neighbourhood. Pay cash on delivery.',
 footerNote:'Serving Alamdanga · Cash on delivery'
};
export async function getBranding():Promise<Branding>{
 const item=await db.platformSetting.findUnique({where:{key:BRAND_KEY},select:{value:true}});
 if(!item)return defaultBranding;
 try{
  const data=JSON.parse(item.value);
  const result=brandSchema.safeParse({...defaultBranding,...data});
  return result.success?result.data:defaultBranding;
 }catch{return defaultBranding}
}
export async function getPublicBrandAssets(){
 return db.brandAsset.findMany({where:{active:true},orderBy:[{sortOrder:'asc'},{createdAt:'asc'}],select:{id:true,kind:true,title:true,subtitle:true,ctaLabel:true,href:true,sortOrder:true}});
}
export function brandAssetUrl(id:string){return '/api/media/branding/'+encodeURIComponent(id)}
