import type {Metadata} from 'next';
import AuthForm from '@/components/auth-form';
export const metadata:Metadata={title:'Create Customer Account | AdPanda',description:'Create a customer account to view orders from local AdPanda shops.'};
export default function Register(){return <AuthForm mode="register"/>;}
