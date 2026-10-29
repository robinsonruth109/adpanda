import 'server-only';
import {Prisma} from '@prisma/client';
import {db} from '@/lib/db';

export async function deliveryPolicy(){
 const settings=await db.platformSetting.findMany({where:{key:{in:['delivery_fee_bdt','delivery_radius_km']}}});
 const map=Object.fromEntries(settings.map(s=>[s.key,s.value]));
 const fee=map.delivery_fee_bdt===undefined?null:Number(map.delivery_fee_bdt);
 const radius=map.delivery_radius_km===undefined?null:Number(map.delivery_radius_km);
 if(fee===null||radius===null||!Number.isFinite(fee)||!Number.isFinite(radius)||fee<0||fee>1000||radius<=0||radius>100)return null;
 return {fee:new Prisma.Decimal(fee.toFixed(2)),radius};
}
export function distanceKm(lat1:number,lng1:number,lat2:number,lng2:number){
 const toRad=(deg:number)=>deg*Math.PI/180;
 const a=Math.sin(toRad(lat2-lat1)/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(toRad(lng2-lng1)/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
export function money(value:Prisma.Decimal){return value.toDecimalPlaces(2,Prisma.Decimal.ROUND_HALF_UP);}
