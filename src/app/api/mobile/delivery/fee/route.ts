import {NextResponse} from 'next/server';
import {deliveryPolicy} from '@/lib/delivery-policy';
export const dynamic='force-dynamic';
export async function GET(){
 const policy=await deliveryPolicy();
 if(!policy)return NextResponse.json({error:'Delivery fee is not configured'},{status:503,headers:{'Cache-Control':'no-store'}});
 return NextResponse.json({deliveryFee:Number(policy.fee),radiusKm:policy.radius},{headers:{'Cache-Control':'no-store'}});
}
