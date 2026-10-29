import type {Metadata} from 'next';
import AuthForm from '@/components/auth-form';
export const metadata:Metadata={title:'Customer Login | AdPanda',description:'Sign in to your AdPanda customer account or browse shops and order without logging in.'};
export default function Login(){return <AuthForm mode="login"/>;}
