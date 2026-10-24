import Link from 'next/link';
import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import {merchantEarnings} from '@/lib/merchant-earnings';
import MerchantPayoutPanel from '@/components/merchant-payout-panel';
export const dynamic='force-dynamic';
export default async function MerchantEarningsPage(){
 const user=await currentUser();
 if(!user)return <main className="section container"><h1>Merchant earnings</h1><p>Please sign in as a merchant owner.</p><Link className="btn" href="/merchant/login">Merchant login</Link></main>;
 const merchants=await db.merchant.findMany({where:{members:{some:{userId:user.id,role:'OWNER'}}},select:{id:true,name:true,status:true,settlements:{orderBy:{createdAt:'desc'},take:30,select:{id:true,amount:true,status:true,createdAt:true,reference:true,reviewNote:true}}}}});
 const data=await Promise.all(merchants.map(async m=>({merchant:m,wallet:await db.$transaction(async tx=>merchantEarnings(tx,m.id))})));
 return <main className="section container adp-merchant-earnings-page"><div className="admin-breadcrumb">Merchant Portal / <strong>Earnings</strong></div><span className="admin-overline">MERCHANT FINANCES</span><h1>Earnings & payouts</h1><p className="muted">Track COD-confirmed earnings and request payouts. Admin must approve and manually pay the request.</p><Link href="/merchant" className="adp-pink-link">← Back to merchant dashboard</Link>
 {data.map(({merchant,wallet})=><div key={merchant.id}><MerchantPayoutPanel merchantId={merchant.id} name={merchant.name} available={wallet.available.toFixed(2)} gross={wallet.gross.toFixed(2)} commission={wallet.fee.toFixed(2)} earned={wallet.earnings.toFixed(2)} reserved={wallet.reserved.toFixed(2)} paid={wallet.paid.toFixed(2)} waiting={wallet.awaitingCash.toFixed(2)} records={merchant.settlements.map(s=>({id:s.id,amount:s.amount.toFixed(2),status:s.status,createdAt:s.createdAt.toISOString(),reference:s.reference,reviewNote:s.reviewNote}))}/></div>)}
 {!data.length&&<div className="admin-empty"><h3>No merchant owner account</h3><p>You must own a merchant account to request payouts.</p><Link href="/merchant" className="btn">Go to merchant portal</Link></div>}
 </main>;
}