import {db} from '@/lib/db';
import AdminRiderManager from '@/components/admin-rider-manager';
export const dynamic='force-dynamic';
export default async function Page(){
 const riders=await db.rider.findMany({include:{user:{select:{name:true,phone:true}},_count:{select:{deliveries:true}}},orderBy:{user:{name:'asc'}},take:200});
 return <section className="admin-riders-page">
  <div className="admin-breadcrumb">Operations / <strong>Riders & dispatch</strong></div>
  <span className="admin-overline">DELIVERY OPERATIONS</span>
  <h1>Rider management</h1>
  <p className="muted">Register delivery partners, approve identities and control manual dispatch availability.</p>
  <AdminRiderManager initialRiders={riders.map(r=>({id:r.id,name:r.user.name,phone:r.user.phone,status:r.status,approved:r.approved,assignments:r._count.deliveries}))}/>
 </section>;
}
