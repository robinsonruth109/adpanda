import {invalidateGroceryPrices} from '@/lib/grocery-price-review';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
const schema=z.object({kitchenId:z.string().min(1).max(100),name:z.string().trim().min(2).max(80)});
export async function POST(request:Request){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const user=await currentUser();if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
 const input=schema.safeParse(await request.json().catch(()=>null));
 if(!input.success)return NextResponse.json({error:'Invalid category name'},{status:400});
 const {kitchenId,name}=input.data;
 const kitchen=await db.kitchen.findFirst({where:{id:kitchenId,merchant:{status:'APPROVED',members:{some:{userId:user.id}}}},select:{id:true}});
 if(!kitchen)return NextResponse.json({error:'Not authorized to manage this kitchen'},{status:403});
 const existing=await db.menuCategory.findFirst({where:{kitchenId,name}});
 if(existing)return NextResponse.json({error:'Category already exists'},{status:409});
 const cat=await db.$transaction(async tx=>{
  await invalidateGroceryPrices(tx,kitchenId);
  const newCat=await tx.menuCategory.create({data:{kitchenId,name}});
  await tx.auditLog.create({data:{actorId:user.id,action:'MERCHANT_CATEGORY_CREATED',entityType:'MenuCategory',entityId:newCat.id,metadata:{kitchenId,name}}});
  return newCat;
 });
 return NextResponse.json({ok:true,id:cat.id,name:cat.name},{status:201});
}
