import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
import {riderCommissionSummary} from '@/lib/rider-commission';
export async function POST(request:Request,{params}:{params:Promise<{riderId:string;date:string}>}){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const admin=await requireRole(['ADMIN']);if(!admin)return NextResponse.json({error:'Admin required'},{status:403});
 const {riderId,date}=await params;const body=await request.json().catch(()=>null);
 if(!body||body.confirmedFundsReceived!==true)return NextResponse.json({error:'Verify actual funds before approving'},{status:400});
 const result=await db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM \`Rider\` WHERE id = ${riderId} FOR UPDATE`;
  const wallet=await riderCommissionSummary(tx,riderId);
  const day=wallet.daily.find(d=>d.date===date);
  if(!day||day.amount.lte(0)||!day.state)return {error:'No payment submission for this date',code:409};
  if(day.state.status==='APPROVED')return {ok:true,alreadyApproved:true};
  await tx.auditLog.create({data:{actorId:admin.id,entityType:'Rider',entityId:riderId,action:'ADMIN_PLATFORM_COMMISSION_APPROVED',metadata:{date,amount:day.amount.toFixed(2),confirmedFundsReceived:true}}});
  return {ok:true,date,amount:day.amount.toFixed(2)};
 });
 return NextResponse.json(result,{status:'error'in result?result.code:200});
}
