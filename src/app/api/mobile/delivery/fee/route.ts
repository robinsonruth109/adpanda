import {NextResponse} from 'next/server';
import {deliveryPolicy} from '@/lib/delivery-policy';
export const dynamic='force-dynamic';
export async function GET(){const policy=await deliveryPolicy();if(!policy)return NextResponse.json({error:'Delivery fee not configured'},{status:503});return NextResponse.json({deliveryFee:Number(policy.fee),radiusKm:policy.radius},{headers:{'Cache-Control':'no-store'}})}
