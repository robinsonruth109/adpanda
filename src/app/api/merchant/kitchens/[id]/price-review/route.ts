import {NextResponse} from 'next/server';
import {Prisma} from '@prisma/client';
import {z} from 'zod';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
import {dhakaDate} from '@/lib/kitchen-hours';

const price=z.string().regex(/^(?:0|[1-9]\d{0,5})(?:\.\d{1,2})?$/,'Use a valid BDT price with up to 2 decimals');
const itemSchema=z.object({
 id:z.string().min(1).max(191),
 acknowledged:z.literal(true),
 price
});
const reviewSchema=z.object({
 catalogVersion:z.number().int().min(0),
 items:z.array(itemSchema).min(1).max(5000)
});
async function ownedStore(id:string,userId:string){
 return db.kitchen.findFirst({
  where:{id,storeType:'GROCERY',active:true,merchant:{status:'APPROVED',members:{some:{userId}}}},
  select:{id:true,name:true,groceryReviewedDate:true,groceryCatalogVersion:true,groceryPriceReviewedAt:true}
 });
}
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const user=await currentUser();
 if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const {id}=await params;
 const store=await ownedStore(id,user.id);
 if(!store)return NextResponse.json({error:'Approved grocery store required'},{status:403});
 const items=await db.menuItem.findMany({
  where:{category:{kitchenId:id}},select:{id:true,name:true,price:true,unitLabel:true,stockQty:true,available:true,category:{select:{name:true,active:true}}},
  orderBy:[{category:{sortOrder:'asc'}},{name:'asc'}]
 });
 return NextResponse.json({
  name:store.name,date:dhakaDate(),catalogVersion:store.groceryCatalogVersion,
  alreadyVerified:store.groceryReviewedDate===dhakaDate(),
  lastVerifiedAt:store.groceryPriceReviewedAt?.toISOString()||null,
  items:items.map(item=>({id:item.id,name:item.name,price:item.price.toFixed(2),unitLabel:item.unitLabel,stockQty:item.stockQty,
   available:item.available&&item.category.active,category:item.category.name}))
 },{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
 const user=await currentUser();
 if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const {id}=await params;
 const parsed=reviewSchema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||'Invalid review submission'},{status:400});
 const requested=parsed.data.items;
 if(new Set(requested.map(item=>item.id)).size!==requested.length)
  return NextResponse.json({error:'Duplicate products in review'},{status:400});
 const mapped=new Map<string,Prisma.Decimal>();
 for(const item of requested){
  const value=new Prisma.Decimal(item.price);
  if(value.lte(0)||value.gt(100000))return NextResponse.json({error:'Product price must be between ৳0.01 and ৳100,000'},{status:400});
  mapped.set(item.id,value);
 }
 const store=await ownedStore(id,user.id);
 if(!store)return NextResponse.json({error:'Approved grocery store required'},{status:403});
 const today=dhakaDate();
 try{
  const result=await db.$transaction(async tx=>{
   // Take an exclusive optimistic version lock before validating products so
   // concurrent catalogue edits/reviews cannot be silently confirmed.
   const changed=await tx.kitchen.updateMany({
    where:{id,storeType:'GROCERY',groceryCatalogVersion:parsed.data.catalogVersion,active:true},
    data:{groceryCatalogVersion:{increment:1},groceryReviewedDate:null}
   });
   if(changed.count!==1)throw Error('STALE_CATALOG');
   const products=await tx.menuItem.findMany({
    where:{category:{kitchenId:id}},select:{id:true,name:true,price:true}
   });
   if(!products.length)throw Error('NO_PRODUCTS');
   if(products.length!==mapped.size||products.some(p=>!mapped.has(p.id)))throw Error('CATALOG_CHANGED');
   const changes: {id:string;name:string;oldPrice:string;newPrice:string}[]=[];
   for(const product of products){
    const next=mapped.get(product.id);
    if(!next)throw Error('CATALOG_CHANGED');
    if(!next.eq(product.price)){
     await tx.menuItem.update({where:{id:product.id},data:{price:next}});
     changes.push({id:product.id,name:product.name,oldPrice:product.price.toFixed(2),newPrice:next.toFixed(2)});
    }
   }
   // If the Bangladesh date changes during a long operation, require a fresh review.
   if(dhakaDate()!==today)throw Error('DAY_CHANGED');
   await tx.kitchen.update({
    where:{id},
    data:{groceryReviewedDate:today,groceryPriceReviewedAt:new Date(),groceryPriceReviewedById:user.id}
   });
   await tx.auditLog.create({data:{
    actorId:user.id,action:'GROCERY_DAILY_PRICE_REVIEW',entityType:'Kitchen',entityId:id,
    metadata:{dhakaDate:today,productCount:products.length,priceChanges:changes}
   }});
   return {count:products.length,changes:changes.length};
  },{timeout:20000});
  return NextResponse.json({ok:true,date:today,reviewed:result.count,changed:result.changes,message:'আজকের সব পণ্যের দাম যাচাই সম্পন্ন। Shop এখন opening rules অনুযায়ী চালু করা যাবে।'});
 }catch(error){
  const message=error instanceof Error?error.message:'';
  if(message==='STALE_CATALOG'||message==='CATALOG_CHANGED')
   return NextResponse.json({error:'Product list বা price অন্য জায়গা থেকে পরিবর্তন হয়েছে। Refresh করে সব পণ্য আবার verify করুন।'},{status:409});
  if(message==='NO_PRODUCTS')
   return NextResponse.json({error:'দোকান খোলার আগে অন্তত একটি পণ্য যোগ করুন।'},{status:409});
  if(message==='DAY_CHANGED')
   return NextResponse.json({error:'নতুন বাংলাদেশি দিন শুরু হয়েছে। দাম আবার যাচাই করুন।'},{status:409});
  console.error('Grocery daily price review failed',error);
  return NextResponse.json({error:'দাম verify করা যায়নি। আবার চেষ্টা করুন।'},{status:500});
 }
}
