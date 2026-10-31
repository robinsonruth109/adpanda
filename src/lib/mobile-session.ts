import 'server-only';
import {createHash,randomBytes} from 'node:crypto';
import {db} from '@/lib/db';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export async function issueMobileSession(userId:string){
 const token=randomBytes(32).toString('hex');
 await db.session.create({data:{userId,tokenHash:hash(token),expiresAt:new Date(Date.now()+7*86400000)}});
 return token;
}
export async function mobileSession(request:Request){
 const header=request.headers.get('authorization')||'';
 if(!/^Bearer [a-f0-9]{64}$/i.test(header))return null;
 const token=header.slice(7);
 const session=await db.session.findUnique({where:{tokenHash:hash(token)},include:{user:true}});
 if(!session||session.expiresAt.getTime()<Date.now())return null;
 return session;
}
export async function revokeMobileSession(request:Request){
 const header=request.headers.get('authorization')||'';
 if(!/^Bearer [a-f0-9]{64}$/i.test(header))return false;
 await db.session.deleteMany({where:{tokenHash:hash(header.slice(7))}});
 return true;
}
