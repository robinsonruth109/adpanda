import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/auth';
import StaffSignIn from '@/components/staff-sign-in';
export const metadata:Metadata={
 title:'Rider Sign In | AdPanda',
 robots:{index:false,follow:false}
};
export const dynamic='force-dynamic';
export default async function RiderLogin(){
 const user=await currentUser();
 if(user?.role==='RIDER')redirect('/rider');
 return <StaffSignIn role="RIDER"/>;
}
