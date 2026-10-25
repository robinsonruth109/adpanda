import 'server-only';
import {createHash,timingSafeEqual} from 'node:crypto';
/** Private bearer capability for a guest order. Only the digest is saved to MySQL. */
export function guestOrderAuthorized(storedHash:string|null|undefined,token:string|null|undefined):boolean{
 if(!storedHash||!token||!/^[a-f0-9]{64}$/.test(token))return false;
 const expected=Buffer.from(storedHash,'hex');
 if(expected.length!==32)return false;
 const current=createHash('sha256').update(token).digest();
 return timingSafeEqual(expected,current);
}
