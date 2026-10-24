import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
import {unallocatedCashLiquidity} from '@/lib/merchant-earnings';
import AdminSettlementManager from '@/components/admin-settlement-manager';
export const dynamic='force-dynamic';
export default async function AdminSettlementsPage(){
 const admin=await requireRole(['ADMIN']);if(!admin)return <section className="admin-workspace"><h1>Admin access required</h1></section>;
 const [items,liquidity]=await Promise.all([
  db.merchantSettlement.findMany({orderBy:{createdAt:'desc'},take:100,include:{merchant:{select:{name:true}}}}),
  db.$transaction(async tx=>unallocatedCashLiquidity(tx))
 ]);
 return <section className="adp-admin-settlement-page"><div className="admin-breadcrumb">Finance / <strong>Merchant payouts</strong></div><span className="admin-overline">MERCHANT FINANCES</span><h1>Payout requests & settlements</h1><p className="muted">Review merchant earnings requests, approve or reject them, then record actual external transfers with unique references. Rider cash receipts and merchant bank payouts are different events.</p>
  <AdminSettlementManager rows={items.map(s=>({id:s.id,merchant:s.merchant.name,amount:s.amount.toFixed(2),status:s.status,method:s.payoutMethod,account:s.payoutAccount,bankName:s.bankName,createdAt:s.createdAt.toISOString(),requestedById:s.requestedById,reference:s.reference,reviewNote:s.reviewNote}))} liquidity={liquidity.toFixed(2)}/>
 </section>;
}