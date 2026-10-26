'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {MapPin,Radio,StopCircle} from 'lucide-react';
export default function RiderLocationSharing({enabled}:{enabled:boolean}){
 const router=useRouter();
 const [sharing,setSharing]=useState(false),[status,setStatus]=useState('GPS sharing is off'),[accuracy,setAccuracy]=useState<number|null>(null),[lastSent,setLastSent]=useState<string|null>(null);
 const watch=useRef<number|null>(null),busy=useRef(false),lastTime=useRef(0);
 async function goOffline(){try{await fetch('/api/rider/availability',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({online:false}),keepalive:true});router.refresh()}catch{}}
 function stop(){if(watch.current!==null&&navigator.geolocation)navigator.geolocation.clearWatch(watch.current);watch.current=null;setSharing(false);setStatus('GPS sharing stopped');void goOffline()}
 useEffect(()=>()=>{if(watch.current!==null&&navigator.geolocation)navigator.geolocation.clearWatch(watch.current)},[]);
 useEffect(()=>{if(!enabled&&watch.current!==null)stop()},[enabled]);
 function start(){
  if(!enabled){setStatus('Admin approval required to share GPS');return}
  if(!navigator.geolocation){setStatus('This browser does not support GPS');return}
  setSharing(true);setStatus('Requesting high-accuracy GPS permission…');
  watch.current=navigator.geolocation.watchPosition(async ({coords})=>{
   setAccuracy(Math.round(coords.accuracy));
   if(coords.accuracy>120){setStatus('Low accuracy ('+Math.round(coords.accuracy)+' m). Move outside for stronger GPS; point not sent.');return}
   if(Date.now()-lastTime.current<9500||busy.current)return;
   busy.current=true;lastTime.current=Date.now();
   try{const response=await fetch('/api/rider/location',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({latitude:coords.latitude,longitude:coords.longitude,accuracyMeters:coords.accuracy})});const data=await response.json();if(!response.ok)throw Error(data.error||'Location update rejected');setLastSent(data.recordedAt||new Date().toISOString());setStatus('GPS active. Rider availability online while sharing.');router.refresh();}
   catch(error){const message=error instanceof Error?error.message:'GPS update failed';setStatus(message);if(message.includes('No active delivery')||message.includes('Location sharing is available'))stop()}
   finally{busy.current=false}
  },error=>{setStatus(error.code===1?'GPS permission denied. Enable location access to share live updates.':'GPS unavailable: '+error.message)},{enableHighAccuracy:true,maximumAge:0,timeout:15000});
 }
 return <section className="rider-location-panel"><div className="rider-location-panel-head"><Radio size={24}/><div><h2>Live delivery location</h2><p>Start GPS to become available for delivery requests. Your location is shared only with authorized dispatch and assigned delivery viewers.</p></div></div>
 <div className="rider-location-controls"><button type="button" className="btn" disabled={sharing||!enabled} onClick={start}><MapPin size={17}/> Start live GPS</button><button type="button" className="btn secondary" disabled={!sharing} onClick={stop}><StopCircle size={17}/> Stop sharing</button></div>
 <p role="status" className="rider-location-status">{status}</p>
 {accuracy!==null&&<small>Last GPS accuracy: {accuracy} m{lastSent?' · Last sent: '+new Date(lastSent).toLocaleTimeString('en-BD',{timeZone:'Asia/Dhaka'}):''}</small>}
 <p className="muted" style={{fontSize:11,marginBottom:0}}>Updates are sent approximately every 10 seconds while this page stays active. Mobile browsers may stop GPS when the screen locks or app goes to background. Turn off sharing when not delivering.</p>
 </section>;
}
