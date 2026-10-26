import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {requireRole} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
import {z} from 'zod';
export async function POST(request:Request){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 const user=await requireRole(['RIDER']);
 if(!user)return NextResponse.json({error:'Rider sign-in required'},{status:403});
 const input=z.object({online:z.boolean()}).safeParse(await request.json().catch(()=>null));
 if(!input.success)return NextResponse.json({error:'Invalid request'},{status:400});
 const rider=await db.rider.findUnique({where:{userId:user.id}});
 if(!rider?.approved)return NextResponse.json({error:'Admin approval required'},{status:403});
 if(rider.status==='SUSPENDED')return NextResponse.json({error:'Account suspended'},{status:403});
 if(rider.status==='BUSY')return NextResponse.json({error:'Complete your active delivery before changing availability'},{status:409});
 const next=input.data.online?'ONLINE':'OFFLINE';
 await db.rider.update({where:{id:rider.id},data:{status:next}});
 return NextResponse.json({ok:true,status:next},{headers:{'Cache-Control':'no-store'}});
}
