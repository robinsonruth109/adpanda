import {S3Client,PutObjectCommand} from '@aws-sdk/client-s3';
import {randomUUID} from 'node:crypto';
export async function storeReturnPhoto(file:FormDataEntryValue|null,orderId:string,kind:'rider'|'merchant'){
 if(!(file instanceof File)||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size<100||file.size>5*1024*1024)throw new Error('A JPG, PNG or WebP photo up to 5 MB is required');
 const bytes=Buffer.from(await file.arrayBuffer());
 const valid=file.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216:file.type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
 if(!valid)throw new Error('Invalid photo content');
 const bucket=process.env.BUCKET_NAME,endpoint=process.env.BUCKET_ENDPOINT,accessKeyId=process.env.BUCKET_ACCESS_KEY_ID,secretAccessKey=process.env.BUCKET_SECRET_ACCESS_KEY;
 if(!bucket||!endpoint||!accessKeyId||!secretAccessKey)throw new Error('Private photo storage is not configured');
 const key='delivery-proof/'+orderId+'/'+randomUUID()+'-return-'+kind+'.'+(file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg');
 const client=new S3Client({region:process.env.BUCKET_REGION||'auto',endpoint,forcePathStyle:process.env.BUCKET_FORCE_PATH_STYLE==='true',credentials:{accessKeyId,secretAccessKey}});
 await client.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:bytes,ContentType:file.type}));
 return key;
}
