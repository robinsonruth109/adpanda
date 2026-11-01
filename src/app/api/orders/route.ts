import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {isTrustedMutation} from '@/lib/request-security';
import {createCodOrder} from '@/lib/create-cod-order';
export async function POST(request:Request){
 if(!isTrustedMutation(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
 const user=await currentUser();
 return createCodOrder(request,user);
}
