import type {Metadata} from 'next';
import MerchantAuth from '@/components/merchant-auth';
import '../merchant-auth.css';
export const metadata:Metadata={title:'Merchant Sign In | AdPanda Partners',description:'Sign in to your AdPanda merchant account.'};
export default function Page(){return <MerchantAuth mode="login"/>;}
