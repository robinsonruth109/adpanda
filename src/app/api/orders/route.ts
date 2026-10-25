import {NextResponse} from 'next/server';
import {Prisma} from '@prisma/client';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
import {deliveryPolicy,distanceKm,money} from '@/lib/delivery-policy';
import {kitchenAvailability} from '@/lib/kitchen-hours';

const phonePattern=/^01[3-9]\d{8}$/;
const input=z.object({
 requestId:z.string().uuid(),
 guestAccess:z.string().regex(/^[a-f0-9]{64}$/),
 kitchenId:z.string().min(1).max(100),
 recipientName:z.string().trim().min(2).max(100),
 recipientPhone:z.string().trim().regex(phonePattern,'11-digit Bangladeshi mobile number required'),
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
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export async function POST(request:Request){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
 const user=await currentUser();
 const customer=user?.role==='CUSTOMER'?user:null;
 const parsed=input.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'নাম, ১১ ডিজিট মোবাইল নম্বর, সম্পূর্ণ ঠিকানা, map pin এবং cart যাচাই করুন।'},{status:400});
 const payload=parsed.data;
 if(new Set(payload.items.map(i=>i.menuItemId)).size!==payload.items.length)return NextResponse.json({error:'একই খাবার একাধিকবার পাওয়া গেছে।'},{status:400});
 const guestTokenHash=customer?null:digest(payload.guestAccess);
 const code='AD'+digest((customer?.id||'GUEST')+':'+payload.requestId).slice(0,16).toUpperCase();
 const previous=await db.order.findUnique({where:{code},select:{id:true,customerId:true,kitchenId:true,guestTokenHash:true}});
 if(previous){
  const authorized=previous.kitchenId===payload.kitchenId&&(customer?previous.customerId===customer.id:previous.customerId===null&&previous.guestTokenHash===guestTokenHash);
  return authorized?NextResponse.json({ok:true,orderId:previous.id,code,guestAccess:customer?null:payload.guestAccess}):NextResponse.json({error:'Checkout request already used'},{status:409});
 }
 const policy=await deliveryPolicy();
 if(!policy)return NextResponse.json({error:'Admin এখনও delivery charge ও delivery area সেট করেননি।'},{status:503});
 if(!customer){
  // Limit no-login orders to reduce unsolicited COD spam. Idempotent retries were checked above.
  const recent=await db.order.count({where:{customerId:null,recipientPhone:payload.recipientPhone,placedAt:{gte:new Date(Date.now()-60*60*1000)}}});
  if(recent>=3)return NextResponse.json({error:'এই নম্বর থেকে অল্প সময়ে অনেক অর্ডার হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।'},{status:429});
 }
 try{
  const order=await db.$transaction(async tx=>{
   const kitchen=await tx.kitchen.findUnique({where:{id:payload.kitchenId},include:{merchant:{select:{status:true}}}});
   if(!kitchen||!kitchen.active||kitchen.merchant.status!=='APPROVED'||!kitchenAvailability(kitchen).open)throw Error('Kitchen is not accepting orders');
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
   const address=await tx.address.create({data:{
    userId:customer?.id||null,
    label:payload.address.label,
    details:payload.address.details,
    landmark:payload.address.landmark||null,
    latitude:payload.address.latitude,
    longitude:payload.address.longitude
   }});
   const created=await tx.order.create({data:{
    code,customerId:customer?.id||null,guestTokenHash,
    recipientName:payload.recipientName,recipientPhone:payload.recipientPhone,
    kitchenId:kitchen.id,addressId:address.id,status:'PLACED',
    foodSubtotal:subtotal,deliveryFee:policy.fee,discountAmount:new Prisma.Decimal(0),
    codTotal:money(subtotal.add(policy.fee)),
    commissionRate,commissionAmount,merchantPayable:money(subtotal.sub(commissionAmount)),
    items:{create:lines}
   }});
   await tx.orderEvent.create({data:{orderId:created.id,toStatus:'PLACED',actorId:customer?.id||null,note:'COD order and delivery entrance confirmed'+(customer?' by customer':' by guest')}});
   return created;
  });
  return NextResponse.json({ok:true,orderId:order.id,code:order.code,guestAccess:customer?null:payload.guestAccess},{status:201,headers:{'Cache-Control':'no-store'}});
 }catch(error){
  if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002'){
   const existing=await db.order.findUnique({where:{code},select:{id:true,customerId:true,kitchenId:true,guestTokenHash:true}});
   if(existing&&existing.kitchenId===payload.kitchenId&&(customer?existing.customerId===customer.id:existing.customerId===null&&existing.guestTokenHash===guestTokenHash))
    return NextResponse.json({ok:true,orderId:existing.id,code,guestAccess:customer?null:payload.guestAccess});
  }
  const message=error instanceof Error?error.message:'Order could not be placed';
  const safe=['Kitchen is not accepting orders','Kitchen commission is not configured','Delivery location is outside this kitchen service radius','One or more food items are not available','Unavailable food item','Invalid order subtotal'];
  if(safe.includes(message))return NextResponse.json({error:message},{status:409});
  console.error('Customer order creation failed',error);
  return NextResponse.json({error:'অর্ডারটি নেওয়া যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।'},{status:500});
 }
}
