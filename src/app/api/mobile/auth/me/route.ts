import {NextResponse} from 'next/server';import {mobileSession} from '@/lib/mobile-session';
export async function GET(request:Request){const s=await mobileSession(request);if(!s)return NextResponse.json({error:'Unauthorized'},{status:401});return NextResponse.json({user:{id:s.user.id,name:s.user.name,role:s.user.role},expiresAt:s.expiresAt.toISOString()},{headers:{'Cache-Control':'no-store'}})}
