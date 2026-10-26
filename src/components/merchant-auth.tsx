'use client';

import {useState, type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowRight, Check, ChefHat, Eye, EyeOff, LockKeyhole, Phone, ShieldCheck, Sparkles, Store, UserRound, UtensilsCrossed, AlertCircle} from 'lucide-react';

type Mode = 'login' | 'signup';
const phonePattern = /^01[3-9]\d{8}$/;

export default function MerchantAuth({mode}:{mode:Mode}){
 const router=useRouter();
 const signup=mode==='signup';
 const [name,setName]=useState('');
 const [phone,setPhone]=useState('');
 const [password,setPassword]=useState('');
 const [confirm,setConfirm]=useState('');
 const [showPassword,setShowPassword]=useState(false);
 const [showConfirm,setShowConfirm]=useState(false);
 const [agreed,setAgreed]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const phoneValid=phonePattern.test(phone);
 const passwordValid=password.length>=10&&password.length<=128;
 const canSubmit=phoneValid&&passwordValid&&(!signup||(name.trim().length>=2&&name.trim().length<=100&&password===confirm&&agreed));
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(busy)return;
  setError('');
  if(!phoneValid){setError('Enter a valid 11-digit Bangladesh mobile number.');return;}
  if(signup&&name.trim().length<2){setError('Please enter your full name.');return;}
  if(signup&&!passwordValid){setError('Use a password with at least 10 characters.');return;}
  if(signup&&password!==confirm){setError('Your passwords do not match.');return;}
  if(signup&&!agreed){setError('Please accept the merchant terms to continue.');return;}
  setBusy(true);
  try{
   const response=await fetch(signup?'/api/auth/register':'/api/auth/merchant/login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(signup?{name:name.trim(),phone,password}:{phone,password})});
   const body=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(body.error||'Something went wrong. Please try again.');
   router.replace(signup?'/merchant':(body.redirectTo||'/merchant'));
   router.refresh();
  }catch(err){setError(err instanceof Error?err.message:'Unable to continue. Please try again.');setBusy(false);}
 }
 return <main className="mp-auth">
  <div className="mp-shell">
   <section className="mp-showcase" aria-label="AdPanda merchant platform">
    <div className="mp-showcase-top"><div className="mp-mark"><Store size={19}/></div><span>AdPanda <strong>for Partners</strong></span></div>
    <div className="mp-showcase-main">
     <div className="mp-mini-tag"><Sparkles size={15}/> THE FUTURE OF LOCAL FOOD</div>
     <h2>Your kitchen.<br/>Your customers.<br/><em>More possibilities.</em></h2>
     <p>Turn your passion for great food into a thriving business. Join local food entrepreneurs and grow with AdPanda.</p>
     <div className="mp-benefits">
      <div><span><UtensilsCrossed size={20}/></span><div><strong>Your menu, your way</strong><small>Add dishes, manage availability and grow your brand.</small></div></div>
      <div><span><ChefHat size={20}/></span><div><strong>Built for local kitchens</strong><small>Simple tools for takeaways, restaurants and cloud kitchens.</small></div></div>
      <div><span><ShieldCheck size={20}/></span><div><strong>Clear partner onboarding</strong><small>Apply for verification before your kitchen goes live.</small></div></div>
     </div>
    </div>
    <div className="mp-showcase-bottom"><span>🐼</span><div><strong>Made for Alamdanga</strong><small>Powering the next generation of local food businesses</small></div></div>
   </section>
   <section className="mp-form-side">
    <div className="mp-form-wrap">
     <div className="mp-mobile-brand"><span>🐼</span> AdPanda Partner</div>
     <div className="mp-header"><div className="mp-overline"><span className="mp-overline-dot"/> MERCHANT PORTAL</div><h1>{signup?'Become an AdPanda partner':'Welcome back, partner'}</h1><p>{signup?'Create your partner account, then submit your kitchen details for approval.':'Sign in to manage your kitchen, menu and partner activity.'}</p></div>
     <div className="mp-tabs" role="navigation" aria-label="Merchant authentication"><Link aria-current={!signup?'page':undefined} className={!signup?'active':''} href="/merchant/login">Sign in</Link><Link aria-current={signup?'page':undefined} className={signup?'active':''} href="/merchant/signup">Create account</Link></div>
     {signup&&<div className="mp-step"><span>1</span><div><strong>Step 1 of 2 · Partner account</strong><small>Next: Add your kitchen and location</small></div></div>}
     <form onSubmit={submit} noValidate>
      {signup&&<div className="mp-field"><label htmlFor="mp-name">Your full name</label><div className="mp-input"><UserRound size={18}/><input id="mp-name" autoComplete="name" value={name} onChange={e=>setName(e.target.value)} maxLength={100} placeholder="e.g. Abdullah Al Sabbir" required/></div></div>}
      <div className="mp-field"><label htmlFor="mp-phone">Mobile number</label><div className="mp-input"><Phone size={18}/><input id="mp-phone" inputMode="numeric" type="tel" autoComplete="tel-national" pattern="01[3-9][0-9]{8}" maxLength={11} value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,11))} placeholder="01XXXXXXXXX" required/></div><small>Use an active 11-digit Bangladeshi mobile number.</small></div>
      <div className="mp-field"><div className="mp-field-label"><label htmlFor="mp-password">Password</label></div><div className="mp-input"><LockKeyhole size={18}/><input id="mp-password" type={showPassword?'text':'password'} autoComplete={signup?'new-password':'current-password'} minLength={signup?10:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} placeholder={signup?'Create a secure password':'Enter your password'} required/><button type="button" className="mp-eye" onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff size={19}/>:<Eye size={19}/>}</button></div>{signup&&<div className="mp-hint"><span className={passwordValid?'mp-good':''}><Check size={14}/> At least 10 characters</span></div>}</div>
      {signup&&<div className="mp-field"><label htmlFor="mp-confirm">Confirm password</label><div className="mp-input"><LockKeyhole size={18}/><input id="mp-confirm" type={showConfirm?'text':'password'} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repeat your password" required/><button type="button" className="mp-eye" onClick={()=>setShowConfirm(!showConfirm)} aria-label={showConfirm?'Hide confirmation':'Show confirmation'}>{showConfirm?<EyeOff size={19}/>:<Eye size={19}/>}</button></div>{confirm.length>0&&<small className={password===confirm?'mp-match':'mp-mismatch'}>{password===confirm?'Passwords match':'Passwords do not match'}</small>}</div>}
      {signup&&<label className="mp-consent"><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/><span>I agree to AdPanda&apos;s partner onboarding and understand that kitchen activation is subject to admin approval.</span></label>}
      {error&&<div className="mp-error" role="alert"><AlertCircle size={17}/><span>{error}{!signup&&error.toLowerCase().includes('credentials')?' Check your phone number and password.':''}</span></div>}
      <button className="mp-submit" type="submit" disabled={busy||!canSubmit}>{busy?'Please wait…':signup?'Create partner account':'Sign in to dashboard'}{!busy&&<ArrowRight size={18}/>}</button>
     </form>
     <p className="mp-switch">{signup?'Already have a partner account?':'New to AdPanda?'} <Link href={signup?'/merchant/login':'/merchant/signup'}>{signup?'Sign in':'Create your partner account'} <ArrowRight size={14}/></Link></p>
     <div className="mp-safe"><ShieldCheck size={17}/><span>Secure password login · No OTP required · Your details stay private</span></div>
    </div>
    <div className="mp-form-footer"><span>© {new Date().getFullYear()} AdPanda</span><Link href="/">← Back to food marketplace</Link></div>
   </section>
  </div>
 </main>;
}
