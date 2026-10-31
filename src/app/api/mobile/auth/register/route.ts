import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {hashPassword} from '@/lib/auth';
import {issueMobileSession} from '@/lib/mobile-session';
const schema=z.object({name:z.string().trim().min(2).max(100),phone:z.string().regex(/^01[3-9]\d{8}$/),password:z.string().min(10).max(128)}).strict();
export async function POST(request:Request){
 if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return NextResponse.json({error:'JSON required'},{status:415});
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Use a valid name, Bangladeshi mobile and password (at least 10 characters)'},{status:400});
 const {name,phone,password}=parsed.data;
 try{
  const user=await db.user.create({data:{name,phone,passwordHash:hashPassword(password),role:'CUSTOMER'}});
  const token=await issueMobileSession(user.id);
  return NextResponse.json({token,expiresIn:604800,user:{id:user.id,name:user.name,role:user.role},app:'customer'},{status:201,headers:{'Cache-Control':'no-store'}});
 }catch(e){
  if(e&&typeof e==='object'&&'code'in e&&e.code==='P2002')return NextResponse.json({error:'This mobile number is already registered. Please log in.'},{status:409});
  console.error('Mobile registration error',e);
  return NextResponse.json({error:'Could not register. Please try again.'},{status:500});
 }
}
