'use client';
import {useEffect,useMemo,useState} from 'react';
import {Bike,MapPin,Navigation,RefreshCw,Radio} from 'lucide-react';
type Point={latitude:number;longitude:number};
type TrackLocation=Point&{accuracyMeters:number|null;recordedAt:string;ageSeconds:number};
type Response={orderStatus:string;tracking:boolean;location:TrackLocation|null;lastSeenSeconds?:number|null};
const TILE=256,ZOOM=17,SIZE=460;
function world(lat:number,lon:number){const sin=Math.sin(Math.min(85,Math.max(-85,lat))*Math.PI/180),scale=TILE*2**ZOOM;return {x:(lon+180)/360*scale,y:(.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*scale}}
function tiles(center:Point){const p=world(center.latitude,center.longitude),left=p.x-SIZE/2,top=p.y-SIZE/2,max=2**ZOOM;const parts:{key:string;url:string;x:number;y:number}[]=[];for(let x=Math.floor(left/TILE);x<=Math.floor((left+SIZE)/TILE);x++)for(let y=Math.floor(top/TILE);y<=Math.floor((top+SIZE)/TILE);y++)if(y>=0&&y<max)parts.push({key:x+'-'+y,url:'https://tile.openstreetmap.org/'+ZOOM+'/'+((x+max)%max)+'/'+y+'.png',x:x*TILE-left,y:y*TILE-top});return {parts,p}}
function offset(from:Point,to:Point){const a=world(from.latitude,from.longitude),d=world(to.latitude,to.longitude);return {left:(SIZE/2+d.x-a.x)/SIZE*100+'%',top:(SIZE/2+d.y-a.y)/SIZE*100+'%'}}
export default function LiveOrderTracker({orderId,kitchen,delivery}:{orderId:string;kitchen:Point;delivery:Point}){
 const [data,setData]=useState<Response|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 useEffect(()=>{let mounted=true;const controller=new AbortController();async function refresh(){try{const res=await fetch('/api/orders/'+encodeURIComponent(orderId)+'/tracking',{cache:'no-store',signal:controller.signal});if(!res.ok)throw Error('Tracking is unavailable');const result=await res.json() as Response;if(mounted){setData(result);setError('')}}catch(e){if(mounted&&!(e instanceof Error&&e.name==='AbortError'))setError('Could not refresh tracking')}}void refresh();const interval=window.setInterval(()=>void refresh(),12000);return()=>{mounted=false;controller.abort();window.clearInterval(interval)}},[orderId]);
 const location=data?.location||null;
 const map=useMemo(()=>location?tiles(location):null,[location?.latitude,location?.longitude]);
 return <section className="live-order-tracker"><div className="live-order-tracker-heading"><div><Radio size={20}/><h2>Live rider tracking</h2></div><span>{location?'GPS active':data?.tracking?'Waiting for GPS':'Not tracking'}</span></div>
 {data?.orderStatus&&<p className="muted">Order status: <strong>{data.orderStatus.replaceAll('_',' ')}</strong></p>}
 {location&&map?<><div className="live-rider-map" role="img" aria-label="Live map with rider, kitchen and delivery destination">
 {map.parts.map(t=><img alt="" key={t.key} draggable={false} src={t.url} style={{position:'absolute',width:TILE/SIZE*100+'%',height:TILE/SIZE*100+'%',left:t.x/SIZE*100+'%',top:t.y/SIZE*100+'%'}}/>)}
 <span className="live-map-pin rider" style={{left:'50%',top:'50%'}}>🛵</span>
 <span className="live-map-pin kitchen" style={offset(location,kitchen)}>🏪</span>
 <span className="live-map-pin delivery" style={offset(location,delivery)}>📍</span>
 <span className="live-map-credits">© OpenStreetMap contributors</span></div>
 <p className="live-map-legend">🛵 Rider &nbsp; 🏪 Kitchen &nbsp; 📍 Delivery</p>
 <div className="live-track-detail"><span><Bike size={17}/> Updated {location.ageSeconds}s ago</span><span><MapPin size={17}/> Accuracy ~{Math.round(location.accuracyMeters??0)} m</span></div>
 <a className="btn live-map-open" href={'https://www.google.com/maps?q='+location.latitude+','+location.longitude} target="_blank" rel="noopener noreferrer"><Navigation size={17}/> Open rider pin in Google Maps</a></>:
 <div className="live-track-no-signal"><Bike size={30}/><strong>{data?.tracking?'Rider location is not currently available': 'Live tracking is off'}</strong><p>{data?.tracking?'The rider must enable high-accuracy GPS with an active delivery and keep the page open. Stale locations are hidden.':'Tracking is available after Admin assigns a rider and stops after delivery.'}</p></div>}
 {error&&<p role="alert" className="customer-order-error">{error}</p>}
 <p className="muted" style={{fontSize:11}}>Refreshes every 12 seconds while this page remains open. GPS accuracy depends on the rider’s device and signal. Map markers are approximate and not a guaranteed route or ETA.</p>
 </section>;
}
