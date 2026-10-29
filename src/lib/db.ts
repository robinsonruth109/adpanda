import 'server-only';
import {PrismaClient} from '@prisma/client';
const globalDb=globalThis as unknown as {adpandaDb?:PrismaClient};
export const db=globalDb.adpandaDb??new PrismaClient();
if(process.env.NODE_ENV!=='production')globalDb.adpandaDb=db;
