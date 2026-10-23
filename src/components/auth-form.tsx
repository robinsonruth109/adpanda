'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export default function AuthForm({mode}:{mode:'login'|'register'}){
 const router=useRouter();
 const [password2,setPassword2]=useState('');
 const [name,setName]=useState(''),[phone,setPhone]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(event:React.FormEvent<HTMLFormElement>){
 event.preventDefault();setBusy(true);setError('');
 try{const res=await fetch('/api/auth/'+mode,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(mode==='register'?{name,phone,password}:{phone,password,password2})});const data=await res.json();if(!res.ok)throw Error(data.error||'Could not continue');router.push(data.redirectTo || '/merchant');router.refresh();}catch(e){setError(e instanceof Error?e.message:'Unexpected error')}finally{setBusy(false)}
 }
 return <form onSubmit={submit} className="panel" style={{maxWidth:460,margin:'30px auto',display:'grid',gap:14}}>
 <h1>{mode==='login'?'Sign in to AdPanda':'Create your account'}</h1>
 {mode==='register'&&<label>Full name<input required minLength={2} maxLength={100} style={{width:'100%',padding:12,marginTop:8}} value={name} onChange={e=>setName(e.target.value)}/></label>}
 <label>Bangladeshi phone number<input required autoComplete="tel" pattern="01[3-9][0-9]{8}" placeholder="01XXXXXXXXX" style={{width:'100%',padding:12,marginTop:8}} value={phone} onChange={e=>setPhone(e.target.value)}/></label>
 <label>Password<input required type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={mode==='register'?10:1} style={{width:'100%',padding:12,marginTop:8}} value={password} onChange={e=>setPassword(e.target.value)}/></label>
 {mode==='login'&&<label>Admin second password<input type="password" autoComplete="off" value={password2} onChange={e=>setPassword2(e.target.value)} style={{width:'100%',padding:12,marginTop:8}} /></label>}
 {error&&<p role="alert" style={{color:'#b42318'}}>{error}</p>}
 <button disabled={busy} className="btn">{busy?'Please wait...':mode==='login'?'Sign in':'Register'}</button>
 <p className="muted">Password-based access. Admin accounts require two passwords.</p>
 </form>
}
