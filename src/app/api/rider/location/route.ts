import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';

const payload=z.object({latitude:z.number().finite().min(-85).max(85),longitude:z.number().finite().min(-180).max(180),accuracyMeters:z.number().finite().min(0).max(120)});
export async function POST(request:Request){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const user=await requireRole(['RIDER']);if(!user)return NextResponse.json({error:'Rider login required'},{status:403});
 const input=payload.safeParse(await request.json().catch(()=>null));
 if(!input.success)return NextResponse.json({error:'GPS accuracy must be 120 m or better with valid coordinates'},{status:400});
 const rider=await db.rider.findUnique({where:{userId:user.id},select:{id:true,approved:true,status:true}});
 if(!rider?.approved||rider.status==='SUSPENDED')return NextResponse.json({error:'Admin approval required to enable GPS sharing'},{status:403});
 if(rider.status==='OFFLINE')await db.rider.update({where:{id:rider.id},data:{status:'ONLINE'}});
 // Rider availability begins only after a valid GPS position is received.
 const last=await db.riderLocation.findFirst({where:{riderId:rider.id},orderBy:{recordedAt:'desc'},select:{recordedAt:true}});
 if(last&&Date.now()-last.recordedAt.getTime()<7000)return NextResponse.json({ok:true,throttled:true,recordedAt:last.recordedAt.toISOString()});
 const location=await db.riderLocation.create({data:{riderId:rider.id,latitude:input.data.latitude,longitude:input.data.longitude,accuracyMeters:input.data.accuracyMeters}});
 return NextResponse.json({ok:true,recordedAt:location.recordedAt.toISOString()},{headers:{'Cache-Control':'no-store'}});
}
