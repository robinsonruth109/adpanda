'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';

export default function LogoutButton(){
 const router=useRouter();
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 async function signOut(){
  if(busy)return;
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin',cache:'no-store'});
   if(!response.ok)throw new Error('Logout failed. Please try again.');
   router.replace('/login');
   router.refresh();
  }catch(err){setError(err instanceof Error?err.message:'Logout failed.');setBusy(false);}
 }
 return <div>
  <button type="button" onClick={signOut} disabled={busy} aria-label="Sign out of Admin" style={{width:'100%',marginTop:12,padding:'11px 14px',background:'transparent',border:'1px solid #e6a4a4',borderRadius:9,color:'#b42318',fontWeight:700,cursor:busy?'wait':'pointer',textAlign:'left'}}>{busy?'Signing out…':'↪ Log out'}</button>
  {error&&<p role="alert" style={{color:'#b42318',fontSize:12,marginTop:8}}>{error}</p>}
 </div>;
}
