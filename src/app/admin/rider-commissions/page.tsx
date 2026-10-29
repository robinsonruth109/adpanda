import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
import {riderCommissionSummary} from '@/lib/rider-commission';
import AdminRiderCommissionReview from '@/components/admin-rider-commission-review';
export const dynamic='force-dynamic';
export default async function RiderCommissionsAdmin(){
 const admin=await requireRole(['ADMIN']);if(!admin)return <main>Admin required</main>;
 const riders=await db.rider.findMany({select:{id:true,user:{select:{name:true}}},take:300});
 const all=await Promise.all(riders.map(async r=>({rider:r,summary:await riderCommissionSummary(db,r.id)})));
 const rows=all.flatMap(({rider,summary})=>summary.daily.map(day=>({riderId:rider.id,rider:rider.user.name,date:day.date,amount:day.amount.toFixed(2),status:day.state?.status||'DUE',method:day.state?.method||'—'}))).sort((a,b)=>b.date.localeCompare(a.date));
 return <main className="admin-workspace"><div className="admin-breadcrumb">Finance / Rider commissions</div><h1>AdPanda rider daily commissions</h1><AdminRiderCommissionReview rows={rows}/></main>;
}
