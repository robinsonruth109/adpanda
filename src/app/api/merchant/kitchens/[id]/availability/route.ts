import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
import {kitchenAvailability,validHours,groceryPriceCheckNeeded} from '@/lib/kitchen-hours';
const schema=z.union([z.object({acceptingOrders:z.boolean()}),z.object({mode:z.literal('AUTO')})]);
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
 const user=await currentUser();if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
 const input=schema.safeParse(await request.json().catch(()=>null));
 if(!input.success)return NextResponse.json({error:'Invalid kitchen availability'},{status:400});
 const {id}=await params;
 const kitchen=await db.kitchen.findFirst({where:{id,active:true,merchant:{status:'APPROVED',members:{some:{userId:user.id}}}}});
 if(!kitchen)return NextResponse.json({error:'Not an approved kitchen you manage'},{status:403});
 if(groceryPriceCheckNeeded(kitchen)&&(('acceptingOrders' in input.data&&input.data.acceptingOrders)||'mode' in input.data)){
  return NextResponse.json({error:'আগে আজকের সব Grocery product-এর দাম যাচাই করুন। Daily Price Verification ছাড়া দোকান Open করা যাবে না।',code:'GROCERY_PRICE_REVIEW_REQUIRED'},{status:409});
 }
 if('mode' in input.data&&!validHours(kitchen.weeklyHours))return NextResponse.json({error:'Save valid weekly business hours before enabling automatic mode'},{status:409});
 const mode='mode' in input.data?'AUTO':'MANUAL';
 const update='acceptingOrders' in input.data?{availabilityMode:'MANUAL',acceptingOrders:input.data.acceptingOrders}:{availabilityMode:'AUTO'};
 const saved=await db.$transaction(async tx=>{
  const changed=await tx.kitchen.update({where:{id},data:update});
  await tx.auditLog.create({data:{actorId:user.id,action:'KITCHEN_AVAILABILITY_MODE',entityType:'Kitchen',entityId:id,metadata:{mode,manualOpen:'acceptingOrders' in input.data?input.data.acceptingOrders:null}}});
  return changed;
 });
 const computed=kitchenAvailability({...saved,merchant:{status:'APPROVED'}});
 return NextResponse.json({ok:true,mode:computed.mode,acceptingOrders:computed.open,reason:computed.reason});
}
