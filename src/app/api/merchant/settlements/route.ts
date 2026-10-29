import {NextResponse} from 'next/server';
import {Prisma} from '@prisma/client';
import {z} from 'zod';
import {db} from '@/lib/db';
import {currentUser} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
import {merchantEarnings} from '@/lib/merchant-earnings';

const schema=z.object({
 merchantId:z.string().min(1).max(100),
 amount:z.number().finite().positive().max(1000000),
 method:z.enum(['BKASH','NAGAD','BANK']),
 account:z.string().trim().min(6).max(120),
 bankName:z.string().trim().max(120).optional()
});
function validMoney(value:number){return Number.isSafeInteger(Math.round(value*100))&&Math.abs(value*100-Math.round(value*100))<0.00001;}
export async function POST(request:Request){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const user=await currentUser();
 if(!user)return NextResponse.json({error:'Merchant sign-in required'},{status:401});
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success||!validMoney(parsed.data.amount))return NextResponse.json({error:'Invalid amount or payout method/account'},{status:400});
 const {merchantId,amount,method,account,bankName}=parsed.data;
 if((method==='BKASH'||method==='NAGAD')&&!/^01[3-9]\d{8}$/.test(account))
   return NextResponse.json({error:'Mobile wallet must be an 11-digit Bangladeshi phone number'},{status:400});
 if(method==='BANK'&&(!bankName||bankName.length<3))
   return NextResponse.json({error:'Bank name is required'},{status:400});
 const payout=new Prisma.Decimal(amount.toFixed(2));
 try{
  const result=await db.$transaction(async tx=>{
   const merchant=await tx.merchant.findFirst({where:{id:merchantId,status:'APPROVED',members:{some:{userId:user.id,role:'OWNER'}}},select:{id:true}});
   if(!merchant)return {error:'Only an approved merchant owner can request a payout',code:403};
   const wallet=await merchantEarnings(tx,merchantId);
   if(wallet.available.lt(payout))return {error:'Request exceeds COD-confirmed unreserved merchant earnings',code:409};
   const settlement=await tx.merchantSettlement.create({data:{
    merchantId,requestedById:user.id,amount:payout,status:'PENDING',payoutMethod:method,payoutAccount:account,bankName:method==='BANK'?bankName:null
   }});
   await tx.auditLog.create({data:{actorId:user.id,action:'MERCHANT_PAYOUT_REQUEST',entityType:'MerchantSettlement',entityId:settlement.id,metadata:{merchantId,amount:payout.toFixed(2),method}}});
   return {ok:true,settlementId:settlement.id};
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:10000,timeout:15000});
  if('error' in result)return NextResponse.json({error:result.error},{status:result.code});
  return NextResponse.json(result,{status:201});
 }catch(error){
  if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2034')return NextResponse.json({error:'Wallet changed concurrently; refresh and retry'},{status:409});
  console.error('Merchant payout request failed',error);
  return NextResponse.json({error:'Could not create payout request'},{status:500});
 }
}
