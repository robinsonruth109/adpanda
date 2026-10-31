import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {verifyPassword} from '@/lib/auth';
import {issueMobileSession} from '@/lib/mobile-session';
const schema=z.object({phone:z.string().regex(/^01[3-9]\d{8}$/),password:z.string().min(1).max(128),app:z.enum(['customer','rider','merchant'])}).strict();
export async function POST(request:Request){
 if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return NextResponse.json({error:'JSON required'},{status:415});
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Invalid credentials'},{status:400});
 const {phone,password,app}=parsed.data;
 const user=await db.user.findUnique({where:{phone}});
 if(!user||!user.passwordHash||!verifyPassword(password,user.passwordHash))return NextResponse.json({error:'Invalid credentials'},{status:401,headers:{'Cache-Control':'no-store'}});
 if(app==='customer'&&user.role!=='CUSTOMER')return NextResponse.json({error:'Wrong account type'},{status:403});
 if(app==='rider'){
  if(user.role!=='RIDER')return NextResponse.json({error:'Wrong account type'},{status:403});
  const rider=await db.rider.findUnique({where:{userId:user.id},select:{approved:true}});
  if(!rider?.approved)return NextResponse.json({error:'Rider approval pending'},{status:403});
 }
 if(app==='merchant'){
  if(!['MERCHANT','CUSTOMER'].includes(user.role))return NextResponse.json({error:'Wrong account type'},{status:403});
  const membership=await db.merchantMember.findFirst({where:{userId:user.id},select:{id:true}});
  if(!membership)return NextResponse.json({error:'No merchant membership'},{status:403});
 }
 const token=await issueMobileSession(user.id);
 return NextResponse.json({token,expiresIn:604800,user:{id:user.id,name:user.name,role:user.role},app},{headers:{'Cache-Control':'no-store'}});
}
