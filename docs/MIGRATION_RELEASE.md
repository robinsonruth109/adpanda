# Initial MySQL migration release procedure

The first deployable migration must be generated and reviewed before production application.

## Step 1: CI validation and SQL review
The GitHub Actions workflow `Validate and preview initial database migration` generates SQL from the Prisma schema and uploads an artifact. The job uses a dummy MySQL URL; it DOES NOT contact Railway MySQL or apply SQL.

Do not deploy a SQL preview directly. Review the full SQL against the current schema. Confirm:
- The target Railway MySQL database has no pre-existing application tables or migrations that conflict.
- All intended tables, foreign keys, defaults, indexes, relation constraints and decimal precision are correct.
- The migration is repeatable only via Prisma migration tracking, not raw SQL reruns.

## Step 2: Commit first migration (after review)
Put the reviewed SQL into `prisma/migrations/<timestamp>_initial/migration.sql`; add `prisma/migrations/migration_lock.toml` with `provider = "mysql"`.

## Step 3: Apply on staging first
On an isolated staging database, run `npx prisma migrate deploy`. Check schema and exercise account, merchant approval, kitchen and menu operations. DO NOT use `prisma migrate dev` or `prisma db push` against production.

## Step 4: Production rollout
Back up Railway MySQL, verify migration state with `npx prisma migrate status`, and then explicitly run `npx prisma migrate deploy` with trusted authorized access (or configure Railway pre-deploy command only after the migration is reviewed and committed). Confirm status afterwards.

## Blockers before public onboarding
- OTP/phone verification; sign-up rate limits and brute-force controls
- CSRF/origin checks for sensitive POST/PATCH APIs
- Verified initial ADMIN bootstrap, never a public self-elevation endpoint
- Merchant ownership + fixed location review
- Tests and monitoring

The demo homepage remains intentionally public until customer marketplace is connected to the real kitchen database.
