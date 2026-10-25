import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import MerchantShell from '@/components/merchant-shell';
import {kitchenAvailability} from '@/lib/kitchen-hours';
import type {ReactNode} from 'react';
export const dynamic='force-dynamic';
export default async function MerchantLayout({children}:{children:ReactNode}){
 const user=await currentUser();
 if(!user)return <>{children}</>;
 const memberships=await db.merchantMember.findMany({where:{userId:user.id},include:{merchant:{include:{kitchens:true}}},take:10});
 if(!memberships.length)return <>{children}</>;
 const kitchen=memberships.flatMap(m=>m.merchant.kitchens).find(k=>k.active)||memberships.flatMap(m=>m.merchant.kitchens)[0];
 const merchant=memberships.find(m=>m.merchant.kitchens.some(k=>k.id===kitchen?.id))?.merchant||memberships[0].merchant;
 const approved=merchant.status==='APPROVED';
 const newOrders=await db.order.count({where:{kitchen:{merchantId:{in:memberships.map(m=>m.merchantId)}},status:'PLACED'}});
 return <MerchantShell name={user.name} kitchenName={kitchen?.name||merchant.name} approved={approved} acceptingOrders={kitchen? kitchenAvailability({...kitchen,merchant:{status:merchant.status}}).open:false} newOrders={newOrders}>{children}</MerchantShell>;
}
