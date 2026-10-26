import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {verifyPassword,createLogin} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';

const credentials=z.object({
 phone:z.string().regex(/^01[3-9]\d{8}$/),
 password:z.string().min(1).max(128)
}).strict();
export async function POST(request:Request){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
 const parsed=credentials.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Invalid credentials'},{status:400});
 const user=await db.user.findUnique({where:{phone:parsed.data.phone}});
 if(!user||user.role!=='RIDER'||!user.passwordHash||!verifyPassword(parsed.data.password,user.passwordHash))
  return NextResponse.json({error:'Invalid credentials'},{status:401,headers:{'Cache-Control':'no-store'}});
 await createLogin(user.id);
 return NextResponse.json({ok:true,redirectTo:'/rider'},{headers:{'Cache-Control':'no-store'}});
}
