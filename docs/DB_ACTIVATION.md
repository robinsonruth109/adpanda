# MySQL activation checklist

## Current release
Merchant registration/login and menu management source code exists, but database schema migration is NOT yet applied, and these routes are **not production-ready**. Public home page continues to show demo kitchens. Real merchant data must not be enabled for customers yet.

## Prepare initial migration (development database only)
On a machine with Node/npm and a dedicated empty MySQL DEVELOPMENT database:

```bash
npm install
cp .env.example .env
# Set DATABASE_URL to your disposable DEVELOPMENT MySQL database, not Railway production.
npx prisma validate
npx prisma generate
npx prisma migrate dev --name initial
npm run build
```

Review generated SQL under `prisma/migrations/<timestamp>_initial/migration.sql`, especially FK constraints, before committing it. Do not substitute `prisma db push` against production. After SQL review and backups, use `npx prisma migrate deploy` as an explicit Railway pre-deploy migration step.

## Admin bootstrap
The public account register endpoint creates CUSTOMER users only. An authorized operator must provision the initial ADMIN role through a separate audited setup procedure after verifying the rightful owner of the account. Never create a public bootstrap-admin endpoint or ship a hardcoded admin password.

## Security blockers before real public onboarding
- OTP phone verification and anti-abuse/rate limiting
- CSRF/origin enforcement on mutating routes, plus role checks
- Session cleanup and rotation controls
- Map-pin validation, review queue, and merchant ownership checks
- Proper object upload verification and private document access
- End-to-end automated testing

## Railway
App runs on Railway using the existing `HOSTNAME=0.0.0.0` standalone start command. Make sure `DATABASE_URL` is set as a Railway reference variable to your MySQL service. Bucket variables are unrelated to database migrations.

New pages: `/register`, `/login`, `/merchant`, `/admin`. Their backend calls require migrations first.
