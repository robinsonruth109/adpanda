# AdPanda architecture and development status

## Current state (foundation only)
- Next.js 16 / React 19 / TypeScript website scaffold
- Responsive customer discovery and sample kitchen menu/cart interaction
- Merchant menu toggle PREVIEW only (not persisted)
- Rider/admin empty-state previews
- Initial MySQL Prisma models for roles, merchant/kitchen, menu, order, COD, rider location, ledger and settlement
- Health endpoint: GET /api/health

**NOT IMPLEMENTED:** authentication/permissions, real kitchens, persisted carts/orders, COD payments/collections, real merchant approvals, rider dispatch, maps/GPS, live tracking, notifications, cash reconciliation, actual settlement. No sample data are real merchants. Do not use with real customers or financial transactions yet.

## Domain rules
- Cash on delivery ONLY.
- Merchant kitchen latitude/longitude fixed after approval; changes require admin approval.
- Admin manually assigns rider; riders cannot self-claim unassigned orders.
- One kitchen per cart and order in v1.
- A kitchen may override the platform default commission with its own 0–100% percentage. Store applied rate and calculated amount on each order at acceptance/creation; historical orders never recompute when rate changes.
- Commission applies to food subtotal only, excluding delivery fee. Merchant-funded discounts and subsidies must have explicitly defined accounting rules before taking orders.
- Record each COD collection once, tied to an order and rider. Cash handovers require authorized confirmation and immutable audit trail.
- Post ledger journal lines atomically with order/payment transitions. Validate total debits equal credits in one DB transaction and disallow unbalanced or mutable posted entries.
- Authorization and OTP/phone verification MUST exist before live release.
- Rider GPS requires consent and authenticated scoped publication; client tracking should be limited to the assigned active order.
- Browser PWA background GPS is not reliable; native rider app later for uninterrupted tracking.
- Keep all sensitive secrets outside repository.

## Next milestones
1. Database migration, seed and robust session-based role authorization.
2. Merchant applications, admin approval, fixed location and persistent menu.
3. Customer addresses, delivery zone and distance fee; validated COD checkout.
4. Order workflow and admin manual dispatch, rider fulfillment.
5. Realtime GPS provider and map navigation.
6. Double-entry ledger, COD deposits, rider earning, merchant settlement with idempotent operations.
7. Automated tests, abuse protection, monitoring and deployment verification.

## Development
```bash
npm install
cp .env.example .env
# Set DATABASE_URL for a dedicated MySQL database
npm run db:generate
npm run db:migrate
npm run dev
```
Run `npm run build` before deploying. No migration files have been generated yet: use a disposable development database for first migrations, review SQL before production. 
