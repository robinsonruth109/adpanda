import {NextResponse} from 'next/server';
import {Prisma} from '@prisma/client';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
import {deliveryPolicy,distanceKm,money} from '@/lib/delivery-policy';

const input=z.object({
 requestId:z.string().uuid(),
 kitchenId:z.string().min(1).max(100),
 items:z.array(z.object({menuItemId:z.string().min(1).max(100),quantity:z.number().int().min(1).max(20)})).min(1).max(25),
 address:z.object({
  label:z.enum(['Home','Office','Other']),
  details:z.string().trim().min(8).max(500),
  landmark:z.string().trim().max(180).optional(),
  latitude:z.number().finite().min(-85).max(85),
  longitude:z.number().finite().min(-180).max(180),
  confirmed:z.literal(true)
 })
});
export async function POST(request:Request){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
 const customer=await requireRole(['CUSTOMER']);
 if(!customer)return NextResponse.json({error:'Sign in with a customer account to order'},{status:401});
 const parsed=input.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Please confirm address pin and valid cart quantities'},{status:400});
 const payload=parsed.data;
 if(new Set(payload.items.map(i=>i.menuItemId)).size!==payload.items.length)return NextResponse.json({error:'Duplicate food items in cart'},{status:400});
 const code='AD'+createHash('sha256').update(customer.id+':'+payload.requestId).digest('hex').slice(0,16).toUpperCase();
 const previous=await db.order.findUnique({where:{code},select:{id:true,customerId:true,kitchenId:true}});
 if(previous)return previous.customerId===customer.id&&previous.kitchenId===payload.kitchenId?NextResponse.json({ok:true,orderId:previous.id,code}):NextResponse.json({error:'Request already used'},{status:409});
 const policy=await deliveryPolicy();
 if(!policy)return NextResponse.json({error:'Admin must configure delivery fee and service radius before orders can be placed'},{status:503});
 try{
  const order=await db.$transaction(async tx=>{
   const kitchen=await tx.kitchen.findUnique({where:{id:payload.kitchenId},include:{merchant:{select:{status:true}}}});
   if(!kitchen||!kitchen.active||!kitchen.acceptingOrders||kitchen.merchant.status!=='APPROVED')throw Error('Kitchen is not accepting orders');
   if(kitchen.commissionRate===null)throw Error('Kitchen commission is not configured');
   if(distanceKm(Number(kitchen.latitude),Number(kitchen.longitude),payload.address.latitude,payload.address.longitude)>policy.radius)throw Error('Delivery location is outside this kitchen service radius');
   const ids=payload.items.map(i=>i.menuItemId);
   const products=await tx.menuItem.findMany({where:{id:{in:ids},available:true,category:{active:true,kitchenId:kitchen.id}}});
   if(products.length!==ids.length)throw Error('One or more food items are not available');
   const indexed=new Map(products.map(item=>[item.id,item]));
   const lines=payload.items.map(i=>{
    const product=indexed.get(i.menuItemId);
    if(!product)throw Error('Unavailable food item');
    const unitPrice=money(new Prisma.Decimal(product.price));
    return {menuItemId:product.id,itemName:product.name,unitPrice,quantity:i.quantity,lineTotal:money(unitPrice.mul(i.quantity))};
   });
   const subtotal=money(lines.reduce((sum,i)=>sum.add(i.lineTotal),new Prisma.Decimal(0)));
   if(subtotal.lte(0)||subtotal.gt(100000))throw Error('Invalid order subtotal');
   const commissionRate=new Prisma.Decimal(kitchen.commissionRate);
   const commissionAmount=money(subtotal.mul(commissionRate).div(100));
   const address=await tx.address.create({data:{userId:customer.id,label:payload.address.label,details:payload.address.details,landmark:payload.address.landmark||null,latitude:payload.address.latitude,longitude:payload.address.longitude}});
   const created=await tx.order.create({data:{
    code,customerId:customer.id,kitchenId:kitchen.id,addressId:address.id,status:'PLACED',
    foodSubtotal:subtotal,deliveryFee:policy.fee,discountAmount:new Prisma.Decimal(0),
    codTotal:money(subtotal.add(policy.fee)),
    commissionRate,commissionAmount,merchantPayable:money(subtotal.sub(commissionAmount)),
    items:{create:lines}
   }});
   await tx.orderEvent.create({data:{orderId:created.id,toStatus:'PLACED',actorId:customer.id,note:'Customer confirmed COD order and delivery pin'}});
   return created;
  });
  return NextResponse.json({ok:true,orderId:order.id,code:order.code},{status:201});
 }catch(error){
  if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002'){
   const existing=await db.order.findUnique({where:{code},select:{id:true,customerId:true,kitchenId:true}});
   if(existing&&existing.customerId===customer.id&&existing.kitchenId===payload.kitchenId)return NextResponse.json({ok:true,orderId:existing.id,code});
  }
  const message=error instanceof Error?error.message:'Order could not be placed';
  const safe=['Kitchen is not accepting orders','Kitchen commission is not configured','Delivery location is outside this kitchen service radius','One or more food items are not available','Unavailable food item','Invalid order subtotal'];
  if(safe.includes(message))return NextResponse.json({error:message},{status:409});
  console.error('Customer order creation failed',error);
  return NextResponse.json({error:'Could not place order. Please try again.'},{status:500});
 }
}
