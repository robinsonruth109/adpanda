import 'server-only';
import {randomUUID} from 'node:crypto';
import {S3Client,PutObjectCommand,GetObjectCommand,DeleteObjectCommand} from '@aws-sdk/client-s3';

let client:S3Client|undefined;
function config(){
 const endpoint=process.env.BUCKET_ENDPOINT;
 const name=process.env.BUCKET_NAME;
 const region=process.env.BUCKET_REGION;
 const accessKeyId=process.env.BUCKET_ACCESS_KEY_ID;
 const secretAccessKey=process.env.BUCKET_SECRET_ACCESS_KEY;
 if(!endpoint||!name||!region||!accessKeyId||!secretAccessKey)throw new Error('Railway bucket configuration is incomplete');
 if(!/^https:\/\//.test(endpoint))throw new Error('Railway bucket endpoint must use HTTPS');
 if(!client)client=new S3Client({
  endpoint,region,credentials:{accessKeyId,secretAccessKey},
  forcePathStyle:process.env.BUCKET_FORCE_PATH_STYLE!=='false',
  maxAttempts:2
 });
 return {client,name};
}
export type ImageFormat={mime:'image/jpeg'|'image/png'|'image/webp';ext:'jpg'|'png'|'webp'};
export function identifyImage(bytes:Uint8Array):ImageFormat|null{
 if(bytes.length<16)return null;
 if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return {mime:'image/jpeg',ext:'jpg'};
 if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10)return {mime:'image/png',ext:'png'};
 if(Buffer.from(bytes.subarray(0,4)).toString()==='RIFF'&&Buffer.from(bytes.subarray(8,12)).toString()==='WEBP')return {mime:'image/webp',ext:'webp'};
 return null;
}
export function menuMediaKey(itemId:string,extension:ImageFormat['ext']){
 return 'media/menu-items/'+itemId+'/'+randomUUID()+'.'+extension;
}
export async function uploadBucketMedia(key:string,body:Buffer,mime:ImageFormat['mime']){
 const {client,name}=config();
 await client.send(new PutObjectCommand({Bucket:name,Key:key,Body:body,ContentType:mime,CacheControl:'private, max-age=0'}));
}
export async function readBucketMedia(key:string){
 const {client,name}=config();
 return client.send(new GetObjectCommand({Bucket:name,Key:key}));
}
export async function deleteBucketMedia(key:string){
 const {client,name}=config();
 await client.send(new DeleteObjectCommand({Bucket:name,Key:key}));
}
export function bucketIsConfigured(){
 return Boolean(process.env.BUCKET_ENDPOINT&&process.env.BUCKET_NAME&&process.env.BUCKET_REGION&&process.env.BUCKET_ACCESS_KEY_ID&&process.env.BUCKET_SECRET_ACCESS_KEY);
}
