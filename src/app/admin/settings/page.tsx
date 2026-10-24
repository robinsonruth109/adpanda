import {db} from '@/lib/db';
import DeliverySettings from '@/components/admin-delivery-settings';
export const dynamic='force-dynamic';
export default async function Page(){
 const records=await db.platformSetting.findMany({where:{key:{in:['delivery_fee_bdt','delivery_radius_km']}}});
 const values=Object.fromEntries(records.map(r=>[r.key,r.value]));
 return <section className="admin-workspace"><span className="admin-overline">PLATFORM OPERATIONS</span><h1>Delivery settings</h1><p className="muted">Set the maximum service distance and the COD checkout delivery fee before taking real orders.</p><DeliverySettings initialFee={values.delivery_fee_bdt||''} initialRadius={values.delivery_radius_km||''}/></section>;
}