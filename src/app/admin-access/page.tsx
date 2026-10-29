import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/auth';
import StaffSignIn from '@/components/staff-sign-in';
export const metadata:Metadata={
 title:'Admin Access | AdPanda',
 robots:{index:false,follow:false,noarchive:true}
};
export const dynamic='force-dynamic';
export default async function AdminAccess(){
 const user=await currentUser();
 if(user?.role==='ADMIN')redirect('/admin');
 return <StaffSignIn role="ADMIN"/>;
}
