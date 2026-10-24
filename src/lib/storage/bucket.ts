import 'server-only';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

/** Railway Bucket (private, S3-compatible). No client-side secret exposure. */
function settings() {
  const endpoint=process.env.BUCKET_ENDPOINT;
  const accessKeyId=process.env.BUCKET_ACCESS_KEY_ID;
  const secretAccessKey=process.env.BUCKET_SECRET_ACCESS_KEY;
  const bucket=process.env.BUCKET_NAME;
  if(!endpoint||!accessKeyId||!secretAccessKey||!bucket) throw new Error('Railway bucket credentials are not configured');
  return {endpoint,accessKeyId,secretAccessKey,bucket,region:process.env.BUCKET_REGION||'auto'};
}
function client(){
  const config=settings();
  return new S3Client({endpoint:config.endpoint,region:config.region,credentials:{accessKeyId:config.accessKeyId,secretAccessKey:config.secretAccessKey},forcePathStyle:process.env.BUCKET_FORCE_PATH_STYLE==='true'});
}
type MediaKind='kitchen-logo'|'kitchen-cover'|'food-image'|'food-gallery'|'merchant-document';
const ALLOWED:Record<MediaKind,readonly string[]>={
 'kitchen-logo':['image/jpeg','image/png','image/webp'],
 'kitchen-cover':['image/jpeg','image/png','image/webp'],
 'food-image':['image/jpeg','image/png','image/webp'],
 'food-gallery':['image/jpeg','image/png','image/webp'],
 'merchant-document':['image/jpeg','image/png','image/webp','application/pdf']
};
const MAX_BYTES:Record<MediaKind,number>={
 'kitchen-logo':5_000_000,'kitchen-cover':5_000_000,'food-image':5_000_000,'food-gallery':5_000_000,'merchant-document':10_000_000
};
const EXT:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','application/pdf':'pdf'};
export function createMediaKey(ownerId:string,kind:MediaKind,contentType:string,size:number){
 if(!/^[A-Za-z0-9_-]{1,100}$/.test(ownerId)) throw new Error('Invalid owner id');
 if(!ALLOWED[kind]?.includes(contentType)) throw new Error('Unsupported media type');
 if(!Number.isSafeInteger(size)||size<=0||size>MAX_BYTES[kind]) throw new Error('File size not allowed');
 return `media/${ownerId}/${kind}/${randomUUID()}.${EXT[contentType]}`;
}
/** Call only after server-side authentication, ownership and quota validation. */
export async function presignMediaUpload(key:string,contentType:string){
 const {bucket}=settings();
 const command=new PutObjectCommand({Bucket:bucket,Key:key,ContentType:contentType});
 return getSignedUrl(client(),command,{expiresIn:180});
}
/** Media remains private; issue short-lived READ URLs only for public approved media. */
export async function presignMediaRead(key:string){
 const {bucket}=settings();
 return getSignedUrl(client(),new GetObjectCommand({Bucket:bucket,Key:key}),{expiresIn:300});
}
/** Server-only delete, guarded by ownership/role checking at caller. */
export async function deleteMedia(key:string){
 const {bucket}=settings();
 return client().send(new DeleteObjectCommand({Bucket:bucket,Key:key}));
}
export type {MediaKind};
