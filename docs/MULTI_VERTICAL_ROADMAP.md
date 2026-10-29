# AdPanda multi-vertical marketplace — architecture & rollout

## Product vision
AdPanda supports three merchant storefront types with one Admin, Merchant, Rider, COD order, commission and customer checkout system:

| Type | Bangladesh use case | Product examples |
| --- | --- | --- |
| FOOD | Restaurants / cloud kitchens | Momo, biriyani, prepared snacks |
| GROCERY | Local grocery stores / মুদি দোকান | Rice, dal, oil, salt, drinks, household essentials |
| STATIONERY | School/office supplies | Pens, notebooks, registers, A4 paper, geometry box |

Customer branding remains **AdPanda** with Foodpanda-inspired color direction but original UI. Customer guest checkout works without mandatory sign-in; name, 11-digit phone, address, optional landmark and verified delivery pin are required.

## Phase 1 — implemented foundation (2026-10-25)
- Retain the existing internal Prisma `Kitchen` table and existing /kitchens route. Introduce `Kitchen.storeType` Prisma enum FOOD/GROCERY/STATIONERY, default FOOD. No food data migration or URL changes.
- Merchant onboarding selects business type; all shops still need verified map entrance and Admin approval. Separate commission per shop remains unchanged.
- Customer landing page advertises all three verticals; store directory filters by type; shared shopping product pages use the same guest COD checkout.
- Existing `MenuCategory` and `MenuItem` act as cross-vertical product catalogue. Products have `unitLabel` such as piece, pack, 500 g, 1 kg; quantity represents integer saleable packs/SKUs, not fractional weight.
- `MenuItem.stockQty: Int?`: null means untracked, zero is sold out, >=1 tracked packs remaining. New inventory is only decremented in the order creation transaction; Admin/Merchant order cancellation restores tracked stock inside the corresponding transaction. Do not count a cancelled item twice. Food records remain untracked by default.
- Admin shop approvals/management lists Food/Grocery/Stationery and lets Admin set shop commission. Railway private bucket media remains shared across all shop types.

## Business model decisions
1. **One checkout = one shop** initially. Never silently combine items from different stores; each store gets its own delivery and COD accounting until multi-vendor checkout with split shipments exists.
2. Platform fees: each shop's approved commission rate, collected against delivered items per existing settlement flow. No arbitrary default commission for grocery or stationery. Admin must explicitly set values.
3. Existing radius and delivery fee are platform-wide during the first rollout. This is **not** suitable for bulky grocery deliveries; do not onboard heavy goods until weight/capacity pricing, rider limits, and out-of-area rules are implemented.
4. Shop fixed entrance coordinates, weekly opening hours, day off, manual open/close and rider pickup workflow are reused.
5. Customer contact is used for COD fulfilment; avoid storing government IDs or sensitive information unnecessarily.
6. Merchant products cannot be ordered if sold out; backend must remain authoritative rather than trusting customer cart prices, stock, or shop location.

## Phase 2 — retail inventory and richer catalogue
- Add `productType`, SKU/barcode, brand, supplier, actual weight/volume, pack-size variants (e.g. চাল 1kg, 5kg) and sorting/filtering.
- Optional expiry date and batch details for perishable grocery items; block expired inventory.
- Stock movements ledger (RECEIVE, ADJUST, RESERVE, RELEASE, FULFIL, RETURN) with admin audit and permissions; low-stock alerts; purchase cost and reorder level.
- Review cancelled/failed/delivered/returned exchanges comprehensively, including partial returns and refunds, before enabling all retail flows. Current simple stock release covers **CANCELLED only**.
- Support minimum order value, substitutions (customer permission) and out-of-stock alternatives for grocery.
- Consistent product-image, banner and thumbnails via Railway bucket. Avoid client-supplied permanent image URLs.

## Phase 3 — operations, delivery and settlement
- Per-shop vertical fee policy and distance zones; package dimensions/weight, fragile stationery and heavy grocery fees; rider maximum carrying weight/capacity.
- Accurate delivery ETA using routing provider (straight-line distance is only an eligibility approximation).
- Substitution approval, damaged/short items, partial returns, cancelled-after-pickup scenarios, COD discrepancy and proof of delivery.
- Reporting by category and shop: GMV, orders, delivered, return rate, commissions, delivery cost, COD due and merchant settlements.
- Item-level P&L, net merchant payable and audited payouts.

## Phase 4 — scaling
- Unified marketplace search with synonym matching in Bangla/English, category filters and ranking.
- Optional multi-store cart with explicit separate fees, consolidated checkout UI, **individual shop orders** and rider routes.
- Customer reorder and saved drop-off points, voucher rules by vertical, seasonal campaigns.
- Merchant staff roles for product management, stock receipt and order preparation.

## Rollout acceptance checklist
- Existing FOOD/Momo House unchanged after migration.
- Create one GROCERY and one STATIONERY account from Merchant signup; both show Pending until Admin approval.
- Admin verifies pin, sets commission, approves; new shops show in the right directory category only.
- Upload one banner and 2-3 products with proper units/images; zero stock must disable ordering.
- Add tracked stock=2, place a COD guest order quantity 1, check stock=1; cancel through Merchant/Admin and verify stock returns to 2.
- Attempt concurrent orders for last unit and verify only one order succeeds.
- Confirm Merchant, Rider and Admin receive names, phones, addresses, landmarks and precise destination pin.
- Test responsive mobile customer, merchant and admin screens.
- Do not offer bulky items, age-restricted products or restricted medicines without appropriate policy, merchant review and delivery capability.

## Key code locations
- Database: `prisma/schema.prisma`, `prisma/migrations/20261025_store_verticals/migration.sql`
- Type labels: `src/lib/store-types.ts`
- Onboarding: `src/components/merchant-application.tsx`, `src/app/api/merchant/apply/route.ts`
- Product management: `src/components/merchant-menu-workspace.tsx`, `src/app/api/merchant/menu/**`
- Inventory and orders: `src/app/api/orders/route.ts`, `src/lib/order-inventory.ts`
- Storefront: `src/app/page.tsx`, `src/app/kitchens/**`
- Admin: `src/app/admin/merchants/page.tsx`, `src/app/admin/kitchens/page.tsx`
