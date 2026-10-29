'use client';
import {useState} from 'react';
import {Copy,Check,Share2} from 'lucide-react';
export default function GuestTrackingLink(){
 const [copied,setCopied]=useState(false),[message,setMessage]=useState('');
 async function copy(){
  try{
   await navigator.clipboard.writeText(window.location.href);
   setCopied(true);setMessage('Private tracking link কপি হয়েছে। নিরাপদ জায়গায় রাখুন।');
  }catch{setMessage('Browser copy করতে পারেনি। Address bar থেকে লিংক কপি করুন।')}
 }
 return <div className="customer-guest-track-link">
  <button type="button" onClick={copy}>{copied?<Check size={17}/>:<Copy size={17}/>} {copied?'Copied ✓':'Copy tracking link / লিংক কপি করুন'}</button>
  {message&&<small role="status">{message}</small>}
 </div>;
}
