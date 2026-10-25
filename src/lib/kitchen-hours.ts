import {z} from 'zod';
/** Hours are in Asia/Dhaka (UTC+6). Day 0 = Sunday. Open intervals are [open,close). */
export const dayNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] as const;
const clock=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const hoursSchema=z.array(z.object({
 day:z.number().int().min(0).max(6),
 closed:z.boolean(),
 open:clock,
 close:clock
})).length(7).superRefine((hours,ctx)=>{
 const unique=new Set(hours.map(d=>d.day));
 if(unique.size!==7)ctx.addIssue({code:'custom',message:'Specify exactly one schedule for each day'});
 for(const d of hours)if(!d.closed&&d.open===d.close)ctx.addIssue({code:'custom',message:dayNames[d.day]+' opening and closing times must differ'});
});
export type DayHours=z.infer<typeof hoursSchema>;
export const defaultKitchenHours:DayHours=dayNames.map((_,day)=>({day,closed:day===5,open:'10:00',close:'22:00'}));
export type AvailabilityRecord={acceptingOrders:boolean;availabilityMode:string;weeklyHours:unknown;active?:boolean;merchant?:{status:string}};
export function validHours(value:unknown):DayHours|null{
 const result=hoursSchema.safeParse(value);
 return result.success?result.data:null;
}
function minutes(value:string){const [hours,mins]=value.split(':').map(Number);return hours*60+mins;}
function isOpenFromDay(d:DayHours[number],nowMinutes:number,previousDay:boolean){
 if(d.closed)return false;
 const start=minutes(d.open),end=minutes(d.close);
 if(start<end)return !previousDay&&nowMinutes>=start&&nowMinutes<end;
 return previousDay?nowMinutes<end:nowMinutes>=start;
}
export function kitchenAvailability(kitchen:AvailabilityRecord,at=new Date()){
 if(kitchen.active===false||kitchen.merchant&&kitchen.merchant.status!=='APPROVED')
  return {open:false,reason:'Kitchen is unavailable',mode:kitchen.availabilityMode};
 if(kitchen.availabilityMode!=='AUTO')
  return {open:kitchen.acceptingOrders,reason:kitchen.acceptingOrders?'Manually open':'Manually closed',mode:'MANUAL'};
 const weekly=validHours(kitchen.weeklyHours);
 if(!weekly)return {open:false,reason:'Opening hours not configured',mode:'AUTO'};
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Dhaka',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(at);
 const part=(type:string)=>parts.find(p=>p.type===type)?.value||'';
 const day=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(part('weekday'));
 if(day<0)return {open:false,reason:'Cannot determine kitchen time',mode:'AUTO'};
 const now=Number(part('hour'))*60+Number(part('minute'));
 const today=weekly.find(s=>s.day===day);
 const yesterday=weekly.find(s=>s.day===(day+6)%7);
 const open=!!(today&&isOpenFromDay(today,now,false)||yesterday&&isOpenFromDay(yesterday,now,true));
 const reason=open?'Open on weekly schedule':today?.closed?'Scheduled day off':'Outside scheduled opening hours';
 return {open,reason,mode:'AUTO'};
}
