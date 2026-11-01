import {NextResponse} from 'next/server';
import {mobileSession} from '@/lib/mobile-session';
import {createCodOrder} from '@/lib/create-cod-order';
export async function POST(request:Request){
 const authorization=request.headers.get('authorization');
 let user:null|{id:string;role:string}=null;
 if(authorization){const session=await mobileSession(request);if(!session||session.user.role!=='CUSTOMER')return NextResponse.json({error:'Unauthorized customer session'},{status:401});user={id:session.userId,role:session.user.role};}
 if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return NextResponse.json({error:'JSON required'},{status:415});
 return createCodOrder(request,user);
}
