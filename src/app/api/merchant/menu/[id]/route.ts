import {invalidateGroceryPrices} from '@/lib/grocery-price-review';
import {isTrustedMutation} from '@/lib/request-security';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {currentUser} from '@/lib/auth';
import {db} from '@/lib/db';

const schema=z.object({
 available:z.boolean().optional(),
 name:z.string().trim().min(2).max(150).optional(),
 description:z.string().trim().max(2000).optional(),
 price:z.number().finite().positive().max(100000).optional(),
 unitLabel:z.string().trim().min(1).max(32).optional(),
 stockQty:z.number().int().min(0).max(1000000).nullable().optional()
}).refine(data=>Object.keys(data).length>0);
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const user=await currentUser();
 if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Invalid item changes'},{status:400});
 const {id}=await params;
 const item=await db.menuItem.findFirst({
  where:{
   id,
   category:{
    kitchen:{
     merchant:{
      status:'APPROVED',
      members:{some:{userId:user.id}}
     }
    }
   }
  },
  select:{id:true,category:{select:{kitchenId:true}}}
 });
 if(!item)return NextResponse.json({error:'Not found or unauthorized'},{status:404});
 await db.$transaction(async tx=>{
  await invalidateGroceryPrices(tx,item.category.kitchenId);
  await tx.menuItem.update({where:{id},data:parsed.data});
  await tx.auditLog.create({data:{actorId:user.id,action:'MERCHANT_MENU_ITEM_UPDATE',entityType:'MenuItem',entityId:id,metadata:{fields:Object.keys(parsed.data)}}});
 });
 return NextResponse.json({ok:true});
}
