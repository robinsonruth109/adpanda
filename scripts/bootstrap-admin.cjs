// One-time owner-operated admin bootstrap. NEVER call from a public route or build.
// Usage (trusted runtime, after verifying ownership):
// ADMIN_BOOTSTRAP_PHONE=01XXXXXXXXX ADMIN_BOOTSTRAP_PASSWORD='long-random-secret' // ADMIN_BOOTSTRAP_NAME='Owner' node scripts/bootstrap-admin.cjs
const { PrismaClient } = require('@prisma/client');
const { randomBytes, scryptSync } = require('node:crypto');
const prisma = new PrismaClient();
const phone = process.env.ADMIN_BOOTSTRAP_PHONE?.trim();
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
const name = process.env.ADMIN_BOOTSTRAP_NAME?.trim() || 'AdPanda Administrator';
async function run() {
  if (!process.env.ADMIN_BOOTSTRAP_CONFIRM || process.env.ADMIN_BOOTSTRAP_CONFIRM !== 'I_AM_THE_OWNER') {
    throw new Error('Owner confirmation required. Set ADMIN_BOOTSTRAP_CONFIRM=I_AM_THE_OWNER.');
  }
  if (!/^01[3-9]\d{8}$/.test(phone || '')) throw new Error('Valid Bangladesh phone required');
  if (!password || password.length < 16 || password.length > 128) throw new Error('Strong admin password required (16-128 chars)');
  const admins = await prisma.user.count({where: {role: 'ADMIN'}});
  if (admins > 0) throw new Error('An admin already exists. Refusing to create or promote another admin.');
  const existing = await prisma.user.findUnique({where: {phone}});
  if (existing) throw new Error('Phone already registered. Refusing to promote an existing account automatically.');
  const salt = randomBytes(16).toString('hex');
  const passwordHash = salt + ':' + scryptSync(password, salt, 64).toString('hex');
  const user = await prisma.user.create({data: {name, phone, role: 'ADMIN', passwordHash}});
  await prisma.auditLog.create({data: {actorId: user.id, action: 'ADMIN_BOOTSTRAP', entityType: 'User', entityId: user.id}});
  console.log('Initial ADMIN created. Remove bootstrap secrets from environment immediately.');
}
run().catch(err=>{console.error(err.message); process.exitCode=1}).finally(()=>prisma.$disconnect());
