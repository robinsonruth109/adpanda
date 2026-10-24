# Initial database activation — 23 October 2026

Railway production MySQL was confirmed reachable and empty by read-only pre-deploy inspection: 0 tables and no `_prisma_migrations`.

Initial versioned Prisma migration in `prisma/migrations/20261022_initial/migration.sql` contains 23 table definitions and 25 foreign keys, without DROP/TRUNCATE/DELETE statements.

Railway app pre-deploy command is configured to run `node scripts/check-db-readiness.cjs && npx prisma migrate deploy`. This applies tracked migrations on each future deploy (idempotently) and prevents serving a release on migration failure. Production deployment and tables must be confirmed via logs. Do not use `prisma db push` in production.

Before real signups: address phone OTP verification, rate limiting, CSRF/origin enforcement, audited admin provisioning and merchant ownership validation.
