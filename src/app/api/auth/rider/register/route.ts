import {NextResponse} from 'next/server';
import {z} from 'zod';
import {Prisma} from '@prisma/client';
import {db} from '@/lib/db';
import {hashPassword} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';

const schema=z.object({
 name:z.string().trim().min(2).max(100),
 phone:z.string().regex(/^01[3-9]\d{8}$/),
 password:z.string().min(8).max(128)
}).strict();

export async function POST(request:Request){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
 const parsed=schema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Provide a name, a valid 11-digit Bangladeshi phone number, and a password of at least 8 characters.'},{status:400});
 const {name,phone,password}=parsed.data;
 try{
  await db.user.create({
   data:{name,phone,passwordHash:hashPassword(password),role:'RIDER',
    rider:{create:{approved:false,status:'OFFLINE'}}}
  });
  return NextResponse.json({ok:true,message:'Registration received. You may sign in, but delivery access requires admin approval.'},{status:201,headers:{'Cache-Control':'no-store'}});
 }catch(error){
  if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002')
   return NextResponse.json({error:'This mobile number is already registered. Please sign in.'},{status:409});
  console.error('Rider registration failed',error);
  return NextResponse.json({error:'Registration failed. Please try again.'},{status:500});
 }
}
