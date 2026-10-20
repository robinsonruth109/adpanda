import 'server-only';
import {randomBytes,createHash,scryptSync,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
import {db} from '@/lib/db';
import type {UserRole} from '@prisma/client';
const COOKIE='adpanda_session';
const WEEK=7*24*60*60;
export function hashPassword(password:string){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(password,salt,64).toString('hex')}
export function verifyPassword(password:string,stored:string){const [salt,hex]=stored.split(':');if(!salt||!hex||hex.length!==128)return false;const expected=Buffer.from(hex,'hex');const actual=scryptSync(password,salt,64);return timingSafeEqual(actual,expected)}
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export async function createLogin(userId:string){const token=randomBytes(32).toString('hex');const expiresAt=new Date(Date.now()+WEEK*1000);await db.session.create({data:{userId,tokenHash:digest(token),expiresAt}});(await cookies()).set(COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:WEEK});}
export async function currentUser(){const token=(await cookies()).get(COOKIE)?.value;if(!token)return null;const session=await db.session.findUnique({where:{tokenHash:digest(token)},include:{user:true}});if(!session||session.expiresAt<new Date())return null;return session.user}
export async function requireRole(roles:UserRole[]){const user=await currentUser();return user&&roles.includes(user.role)?user:null}
export async function logout(){const token=(await cookies()).get(COOKIE)?.value;if(token)await db.session.deleteMany({where:{tokenHash:digest(token)}});(await cookies()).delete(COOKIE)}
