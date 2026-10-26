'use client';
import {useState,type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowRight,Eye,EyeOff,LockKeyhole,Phone,ShieldCheck,Bike} from 'lucide-react';

export default function StaffSignIn({role}:{role:'ADMIN'|'RIDER'}){
 const router=useRouter(),admin=role==='ADMIN';
 const [phone,setPhone]=useState(''),[password,setPassword]=useState(''),[password2,setPassword2]=useState('');
 const [visible,setVisible]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setError('');
  try{
   const response=await fetch('/api/auth/'+(admin?'admin':'rider')+'/login',{
    method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(admin?{phone,password,password2}:{phone,password})
   });
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(data.error||'Sign in failed');
   router.replace(admin?'/admin':'/rider');
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:'Invalid credentials');setBusy(false)}
 }
 return <main className="adp-staff-login-page">
  <section className="adp-staff-login-card">
   <div className="adp-staff-login-icon">{admin?<ShieldCheck size={30}/>:<Bike size={30}/>}</div>
   <span className="adp-staff-login-kicker">{admin?'AUTHORIZED ADMINISTRATORS':'APPROVED DELIVERY PARTNERS'}</span>
   <h1>{admin?'Admin Control Center':'Rider Portal'}</h1>
   <p>{admin?'Restricted access for authorized AdPanda administrators. Both security passwords are required.':'Sign in using your approved AdPanda delivery partner credentials.'}</p>
   <form onSubmit={submit}>
    <label>Account phone number<div><Phone size={18}/><input type="tel" inputMode="numeric" autoComplete="username" required pattern="01[3-9][0-9]{8}" maxLength={11} value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,11))} placeholder="01XXXXXXXXX"/></div></label>
    <label>{admin?'Password 1':'Password'}<div><LockKeyhole size={18}/><input type={visible?'text':'password'} autoComplete="current-password" minLength={1} maxLength={128} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password"/><button type="button" onClick={()=>setVisible(v=>!v)} aria-label={visible?'Hide password':'Show password'}>{visible?<EyeOff size={19}/>:<Eye size={19}/>}</button></div></label>
    {admin&&<label>Password 2 · Additional security<div><ShieldCheck size={18}/><input type="password" autoComplete="off" required maxLength={128} value={password2} onChange={e=>setPassword2(e.target.value)} placeholder="Enter second password"/></div></label>}
    {error&&<p className="adp-staff-login-error" role="alert">{error}</p>}
    <button className="adp-staff-login-submit" disabled={busy||!/^01[3-9]\d{8}$/.test(phone)||!password||(admin&&!password2)}>{busy?'Verifying…':admin?'Secure Admin Sign In':'Sign in as Rider'}<ArrowRight size={18}/></button>
   </form>
   {!admin&&<p style={{textAlign:"center",marginTop:18}}>New delivery partner? <Link href="/rider/register" style={{fontWeight:700,color:"#e60063"}}>Register as Rider</Link></p>}
   <div className="adp-staff-login-bottom"><ShieldCheck size={16}/><span>Private workspace · Role-restricted authentication</span></div>
   <Link href="/" className="adp-staff-login-home">← Back to AdPanda website</Link>
  </section>
 </main>;
}
