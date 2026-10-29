# Merchant milestone — first backend slice

Introduces phone/password registration + login sessions, merchant kitchen applications (pending), admin approvals with per-kitchen commission %, owner-gated menu create/toggle, approved kitchen listing API.

**Operational and security limits:**
- This is an API-only first slice, not a complete merchant UI. Existing preview screens still use demo data.
- Never expose admin approval without an authenticated admin role. No public API grants the ADMIN role; initial admin provisioning must use a separate, carefully audited operator process.
- Do not accept real traffic until database migration is applied, CSRF protections/rate limits and OTP verification are implemented, and login/registration tested.
- Merchant coordinates are supplied in the application and need admin verification before approval.
- Commission audit is logged; only new order records will snapshot applied commissions when checkout is implemented.
- Never use prisma db push against production; produce and review migration SQL before deploying database changes.
- Post-login sessions are stored as SHA-256 token hashes in MySQL; cookie is httpOnly, SameSite=lax, secure on production.
- Public GET /api/kitchens exposes approved kitchen menu info only, not merchant phone or commission rates.
