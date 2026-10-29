import type {Metadata} from 'next';
import MerchantAuth from '@/components/merchant-auth';
import '../merchant-auth.css';
export const metadata:Metadata={title:'Become an AdPanda Merchant | Partner Signup',description:'Create your merchant account and apply to list your kitchen on AdPanda.'};
export default function Page(){return <MerchantAuth mode="signup"/>;}
