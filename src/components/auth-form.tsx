'use client';
import {useState,type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowRight,CheckCircle2,Eye,EyeOff,HeartHandshake,LockKeyhole,Phone,ShieldCheck,ShoppingBag,UserRound,UtensilsCrossed} from 'lucide-react';

type Mode='login'|'register';
const phonePattern=/^01[3-9]\d{8}$/;

export default function AuthForm({mode}:{mode:Mode}){
 const router=useRouter();
 const signup=mode==='register';
 const [name,setName]=useState('');
 const [phone,setPhone]=useState('');
 const [password,setPassword]=useState('');
 const [confirm,setConfirm]=useState('');
 const [showPassword,setShowPassword]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const canSubmit=phonePattern.test(phone)&&password.length>=(signup?10:1)&&(!signup||(name.trim().length>=2&&password===confirm));

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  setError('');
  if(!phonePattern.test(phone)){setError('সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন।');return}
  if(signup&&name.trim().length<2){setError('আপনার পূর্ণ নাম লিখুন।');return}
  if(signup&&(password.length<10||password!==confirm)){setError('কমপক্ষে ১০ অক্ষরের password দিন এবং Confirm করুন।');return}
  setBusy(true);
  try{
   const result=await fetch('/api/auth/'+(signup?'register':'login'),{
    method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(signup?{name:name.trim(),phone,password}:{phone,password})
   });
   const data=await result.json().catch(()=>({}));
   if(!result.ok)throw Error(data.error||'Could not continue. Please try again.');
   router.replace(signup?'/orders':(data.redirectTo||'/orders'));
   router.refresh();
  }catch(err){setError(err instanceof Error?err.message:'Sign in failed. Try again.');setBusy(false)}
 }

 return <main className="adp-customer-auth-page">
  <div className="adp-customer-auth-shell">
   <aside className="adp-customer-auth-showcase">
    <span className="adp-customer-auth-mini">ADPANDA · YOUR NEIGHBOURHOOD MARKETPLACE</span>
    <div className="adp-customer-auth-art" aria-hidden="true"><span>🍔</span><span>🛒</span><span>✏️</span></div>
    <h2>Good things arrive<br/><em>at your doorstep.</em></h2>
    <p>পছন্দের খাবার, মুদি বাজার আর স্টেশনারি—সবকিছু আপনার এলাকার দোকান থেকে।</p>
    <div className="adp-customer-auth-perks">
     <span><UtensilsCrossed size={17}/> Local Food & Shops</span>
     <span><HeartHandshake size={17}/> Cash on Delivery</span>
     <span><ShieldCheck size={17}/> Private Order History</span>
    </div>
   </aside>
   <section className="adp-customer-auth-form-side">
    <div className="adp-customer-auth-eyebrow">WELCOME TO ADPANDA 🐼</div>
    <h1>{signup?'Create your customer account':'Welcome back!'}</h1>
    <p className="adp-customer-auth-intro">{signup?'আপনার অ্যাকাউন্ট তৈরি করে Orders track করুন, favourite shops আবার খুঁজে নিন।':'Customer account দিয়ে Sign in করুন এবং আপনার অর্ডার দেখুন।'}</p>
    <nav className="adp-customer-auth-tabs" aria-label="Customer account access">
     <Link href="/login" aria-current={!signup?'page':undefined} className={!signup?'active':''}>Customer Login</Link>
     <Link href="/register" aria-current={signup?'page':undefined} className={signup?'active':''}>Create Account</Link>
    </nav>
    <form onSubmit={submit} className="adp-customer-auth-fields">
     {signup&&<label><span>আপনার পূর্ণ নাম / Full Name</span><div><UserRound size={19}/><input autoComplete="name" required minLength={2} maxLength={100} placeholder="e.g. Abdullah Sabbir" value={name} onChange={e=>setName(e.target.value)}/></div></label>}
     <label><span>মোবাইল নম্বর / Phone Number</span><div><Phone size={19}/><input inputMode="numeric" type="tel" autoComplete="tel-national" required pattern="01[3-9][0-9]{8}" maxLength={11} value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,11))} placeholder="01XXXXXXXXX"/></div><small>Bangladesh mobile number · 11 digits</small></label>
     <label><span>{signup?'নতুন Password / Create Password':'Password'}</span><div><LockKeyhole size={19}/><input type={showPassword?'text':'password'} autoComplete={signup?'new-password':'current-password'} required minLength={signup?10:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} placeholder={signup?'Minimum 10 characters':'Your password'}/><button type="button" onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff size={19}/>:<Eye size={19}/>}</button></div></label>
     {signup&&<label><span>Confirm Password</span><div><CheckCircle2 size={19}/><input type={showPassword?'text':'password'} autoComplete="new-password" required minLength={10} value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repeat your new password"/></div></label>}
     {error&&<p className="adp-customer-auth-error" role="alert">{error}</p>}
     <button className="adp-customer-auth-submit" type="submit" disabled={busy||!canSubmit}>{busy?'Please wait…':signup?'Create Customer Account':'Sign in to My Account'}<ArrowRight size={18}/></button>
    </form>
    <div className="adp-customer-auth-guest">
     <ShoppingBag size={22}/><div><strong>Login ছাড়াও Order করতে পারবেন!</strong><p>Guest হিসেবে Food, Grocery বা Stationery কিনুন—checkout-এ শুধু নাম, ফোন, ঠিকানা ও delivery pin দিন।</p><Link href="/kitchens">Explore shops without login <ArrowRight size={15}/></Link></div>
    </div>
    <p className="adp-customer-auth-partner-note">দোকানের মালিক? <Link href="/merchant/login">Merchant portal</Link></p>
   </section>
  </div>
 </main>;
}
