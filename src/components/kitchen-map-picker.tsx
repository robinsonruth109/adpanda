'use client';
import {useMemo,useState} from 'react';
type Props={latitude:string;longitude:string;onChange:(lat:string,lng:string)=>void};
const ZOOM=17, TILE=256, SIZE=512;
function clampLat(v:number){return Math.max(-85,Math.min(85,v))}
function world(lat:number,lng:number){const sin=Math.sin(clampLat(lat)*Math.PI/180);const scale=TILE*2**ZOOM;return {x:(lng+180)/360*scale,y:(0.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*scale}}
function geo(x:number,y:number){const scale=TILE*2**ZOOM;return {lat:180/Math.PI*Math.atan(Math.sinh(Math.PI*(1-2*y/scale))),lng:x/scale*360-180}}
export default function KitchenMapPicker({latitude,longitude,onChange}:Props){
 const [center,setCenter]=useState<{lat:number;lng:number}>({lat:23.7602612,lng:88.948616});
 const [link,setLink]=useState('');const [error,setError]=useState('');
 const lat=Number(latitude),lng=Number(longitude),valid=latitude.trim()!==''&&longitude.trim()!==''&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=85&&Math.abs(lng)<=180;
 const focus=valid?{lat,lng}:center;
 const map=useMemo(()=>{const p=world(focus.lat,focus.lng);const left=p.x-SIZE/2,top=p.y-SIZE/2;const tiles=[] as {x:number;y:number;src:string;left:number;top:number}[];const max=2**ZOOM;for(let x=Math.floor(left/TILE);x<=Math.floor((left+SIZE)/TILE);x++)for(let y=Math.floor(top/TILE);y<=Math.floor((top+SIZE)/TILE);y++){if(y>=0&&y<max)tiles.push({x,y,src:`https://tile.openstreetmap.org/${(x+max)%max}/${y}/${ZOOM}.png`,left:x*TILE-left,top:y*TILE-top})}return {tiles,p}},[focus.lat,focus.lng]);
 function pick(x:number,y:number){const p=geo(map.p.x+x-SIZE/2,map.p.y+y-SIZE/2);onChange(p.lat.toFixed(7),p.lng.toFixed(7));setCenter(p);setError('')}
 function parse(){const value=link.trim();const m=value.match(/(?:@|!3d)(-?\d{1,2}\.\d+)(?:,|!4d)(-?\d{1,3}\.\d+)/)||value.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)||value.match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);if(!m){setError('Paste coordinates or a Google Maps URL containing coordinates (@latitude,longitude). Short share links may need to be opened first.');return}const a=Number(m[1]),b=Number(m[2]);if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a)>85||Math.abs(b)>180){setError('Invalid latitude or longitude');return}onChange(a.toFixed(7),b.toFixed(7));setCenter({lat:a,lng:b});setError('')}
 return <section className="location-picker"><h3>📍 Confirm exact kitchen entrance</h3><p className="muted">Desktop/browser GPS may point to a nearby street. Click the correct building or entrance on the map to reposition the pin. Zoom is fixed for precise selection.</p>
 <div className="location-picker-map" role="button" tabIndex={0} aria-label="Select kitchen pin on map" onClick={e=>{const r=e.currentTarget.getBoundingClientRect();pick((e.clientX-r.left)*SIZE/r.width,(e.clientY-r.top)*SIZE/r.height)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(SIZE/2,SIZE/2)}}}>
 {map.tiles.map(t=><img draggable={false} alt="" key={t.x+'-'+t.y} src={t.src} style={{position:'absolute',width:(TILE/SIZE*100)+'%',height:(TILE/SIZE*100)+'%',left:(t.left/SIZE*100)+'%',top:(t.top/SIZE*100)+'%',pointerEvents:'none'}}/>)}
 <div className="location-picker-marker" aria-hidden="true">📍</div><span className="location-picker-attribution">© OpenStreetMap contributors</span></div>
 <div className="location-picker-row"><input aria-label="Paste map coordinates or Google Maps URL" value={link} placeholder="Paste Google Maps URL or lat,lng" onChange={e=>setLink(e.target.value)}/><button type="button" className="btn secondary" onClick={parse}>Use coordinates</button></div>
 {error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
 <p className="muted" style={{fontSize:12}}>Selected: {valid?`${latitude}, ${longitude}`:'Tap the map to select the kitchen'}. {valid&&<a target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps?q=${lat},${lng}`}>Verify in Google Maps ↗</a>}</p>
 </section>
}
