import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import Link from 'next/link';
import MerchantStoreSettings from '@/components/merchant-store-settings';
import {kitchenAvailability} from '@/lib/kitchen-hours';
export const dynamic='force-dynamic';
export default async function MerchantSettingsPage(){
 const user=await currentUser();
 if(!user)return <main className="section container"><h1>Kitchen settings</h1><Link href="/merchant/login" className="btn">Merchant login</Link></main>;
 const members=await db.merchantMember.findMany({where:{userId:user.id},include:{merchant:{select:{status:true,kitchens:true}}}});
 const kitchens=members.flatMap(m=>m.merchant.kitchens.map(k=>({id:k.id,name:k.name,storeType:k.storeType,slug:k.slug,description:k.description||'',address:k.address,latitude:String(k.latitude),longitude:String(k.longitude),commission:k.commissionRate===null?'Not configured':String(k.commissionRate)+'%',approved:m.merchant.status==='APPROVED',open:kitchenAvailability({...k,merchant:{status:m.merchant.status}}).open,mode:k.availabilityMode,hours:k.weeklyHours,hasBanner:Boolean(k.bannerKey),bannerVersion:k.bannerVersion})));
 return <section className="merchant-workspace-page"><div className="merchant-page-intro"><div><span className="merchant-kicker">KITCHEN PROFILE</span><h1>Store settings</h1><p>Manage shop banner, operating hours, opening and closing for Food, Grocery or Stationery.</p></div></div><MerchantStoreSettings kitchens={kitchens}/></section>;
}
