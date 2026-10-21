import {requireRole} from '@/lib/auth';
import {db} from '@/lib/db';
import Link from 'next/link';
import MerchantReviews from '@/components/merchant-reviews';
export const dynamic='force-dynamic';
export default async function Admin(){
 const user=await requireRole(['ADMIN']);
 if(!user)return <main className="section container"><h1>Administrator access</h1><p>This dashboard requires an authorized admin account.</p><Link className="btn" href="/login">Sign in</Link></main>;
 const merchants=await db.merchant.findMany({orderBy:{createdAt:'desc'},include:{kitchens:true,members:{include:{user:{select:{name:true,phone:true}}}}}});
 return <main className="section container"><div className="eyebrow">Admin control</div><h1>Merchant approvals & commissions</h1><MerchantReviews merchants={merchants.map(m=>({id:m.id,name:m.name,status:m.status,owner:m.members[0]?.user.name||'Unknown',phone:m.members[0]?.user.phone||'',kitchens:m.kitchens.map(k=>({name:k.name,address:k.address,latitude:Number(k.latitude),longitude:Number(k.longitude),commissionRate:k.commissionRate===null?10:Number(k.commissionRate)}))}))}/></main>;
}
