import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
import {z} from 'zod';

const schema=z.object({deliveryFee:z.number().finite().min(0).max(1000),deliveryRadiusKm:z.number().finite().min(0.1).max(100)});
export async function PATCH(request:Request){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const admin=await requireRole(['ADMIN']);if(!admin)return NextResponse.json({error:'Admin only'},{status:403});
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Delivery fee must be 0-1000 BDT, radius 0.1-100 km'},{status:400});
 const {deliveryFee,deliveryRadiusKm}=parsed.data;
 await db.$transaction(async tx=>{
  await tx.platformSetting.upsert({where:{key:'delivery_fee_bdt'},create:{key:'delivery_fee_bdt',value:deliveryFee.toFixed(2)},update:{value:deliveryFee.toFixed(2)}});
  await tx.platformSetting.upsert({where:{key:'delivery_radius_km'},create:{key:'delivery_radius_km',value:String(deliveryRadiusKm)},update:{value:String(deliveryRadiusKm)}});
  await tx.auditLog.create({data:{actorId:admin.id,action:'DELIVERY_POLICY_UPDATED',entityType:'PlatformSetting',entityId:'delivery',metadata:{deliveryFee,deliveryRadiusKm}}});
 });
 return NextResponse.json({ok:true});
}
