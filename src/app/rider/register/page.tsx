'use client';
import {useState,type FormEvent} from 'react';
import Link from 'next/link';
import {Bike,Phone,LockKeyhole,UserRound,ArrowRight,ShieldCheck} from 'lucide-react';
export default function RiderRegister(){
 const [name,setName]=useState(''),[phone,setPhone]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setError('');
  if(password!==confirm){setError('Passwords do not match');return}
  setBusy(true);
  try{
   const response=await fetch('/api/auth/rider/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,phone,password})});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(data.error||'Registration failed');
   setDone(true);
  }catch(e){setError(e instanceof Error?e.message:'Registration failed')}finally{setBusy(false)}
 }
 return <main className="adp-staff-login-page"><section className="adp-staff-login-card">
  <div className="adp-staff-login-icon"><Bike size={30}/></div>
  <span className="adp-staff-login-kicker">BECOME A DELIVERY PARTNER</span><h1>Rider Registration</h1>
  {done?<><p>Your rider account has been created. An administrator must approve your account before you can accept deliveries.</p><Link className="btn" href="/rider/login">Go to Rider Sign In →</Link></>:<>
   <p>Register with your Bangladeshi mobile number and password. Delivery access requires admin approval.</p>
   <form onSubmit={submit}>
    <label>Full name<div><UserRound size={18}/><input required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name"/></div></label>
    <label>Mobile number<div><Phone size={18}/><input required type="tel" inputMode="numeric" autoComplete="tel-national" pattern="01[3-9][0-9]{8}" maxLength={11} value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,11))} placeholder="01XXXXXXXXX"/></div></label>
    <label>Password<div><LockKeyhole size={18}/><input required type="password" autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/></div></label>
    <label>Confirm password<div><LockKeyhole size={18}/><input required type="password" autoComplete="new-password" minLength={8} maxLength={128} value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Re-enter password"/></div></label>
    {error&&<p className="adp-staff-login-error" role="alert">{error}</p>}
    <button className="adp-staff-login-submit" disabled={busy||name.trim().length<2||!/^01[3-9]\d{8}$/.test(phone)||password.length<8||password!==confirm}>{busy?'Creating account…':'Register as Rider'}<ArrowRight size={18}/></button>
   </form>
  </>}
  <div className="adp-staff-login-bottom"><ShieldCheck size={16}/><span>Rider accounts require approval before dispatch</span></div>
  <Link href="/rider/login" className="adp-staff-login-home">Already registered? Sign in</Link>
 </section></main>;
}
