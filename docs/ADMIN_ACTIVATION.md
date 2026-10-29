# AdPanda initial administrator activation

Production database: Railway MySQL, 23 application tables plus Prisma migration history, verified 2026-10-23.

**No admin is created automatically by deployment or registration.** Never assign ADMIN from a public API, run bootstrap in a GitHub Action with hardcoded credentials, or store an admin password in the repository.

## One-time authorized owner procedure

1. Verify you control the correct Railway project and production MySQL, and take a backup.
2. From a trusted Railway-connected shell with access to the production DATABASE_URL, execute the CLI-only `scripts/bootstrap-admin.cjs` script.
3. Supply credentials as *temporary environment variables*, e.g. using your terminal's secure secret injection (do not paste real values into GitHub issues or chat):

```sh
ADMIN_BOOTSTRAP_CONFIRM=I_AM_THE_OWNER \
ADMIN_BOOTSTRAP_PHONE=01XXXXXXXXX \
ADMIN_BOOTSTRAP_PASSWORD='<generate a unique 16+ character password>' \
ADMIN_BOOTSTRAP_NAME='AdPanda Owner' \
node scripts/bootstrap-admin.cjs
```

4. The script refuses to run without explicit owner confirmation; rejects weak passwords, registered phone numbers and a database that already contains an ADMIN. It audits creation.
5. Immediately clear transient bootstrap secrets and sign in at `/login` with the chosen admin credentials. Authorized admin dashboard: `/admin`.
6. Do not use this process for additional admins. Build an audited admin management workflow later.

## Merchant workflow
1. A test-only customer account signs in (public registration lacks OTP and rate limiting, so do **not** invite real customers yet).
2. Visit `/merchant`, submit valid kitchen address and GPS coordinates.
3. Admin reviews merchant application, verifies physical location, sets commission percentage and approves.
4. Merchant opens `/merchant` to manage categories/items and item availability.
5. Public `/api/kitchens` will list approved active kitchens. Actual customer shopping checkout has not been activated.

## Security/launch blockers
- SMS/OTP verification and rate limiting for registration and login
- CSRF protection on session-cookie API writes (same-origin checks are initial defence)
- Merchant application abuse limits and business verification
- Per-kitchen order tests, financial checks, courier assignment and COD settlement
- Production logs, exception tracking, privacy handling and API integration tests

**Do not enter live payment or sensitive personal data while onboarding security is incomplete.**
