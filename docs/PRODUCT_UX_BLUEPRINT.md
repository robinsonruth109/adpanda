# AdPanda product and UX blueprint — 2026-10-22

User-provided Foodpanda desktop and mobile screenshots are references for interaction flow and information hierarchy, not assets to copy. Build an original AdPanda design with distinct branding, colors, imagery and accessible components. Do not reuse Foodpanda logos, branded artwork, restaurant photos or proprietary content.

## Customer website and app
- Mobile-first address/location selector, saved address, GPS permission and delivery-zone validation with far-away warning.
- Desktop responsive navigation, search, filters sidebar, cuisine cards, daily deals, offers, promoted kitchens, kitchen cards with real food photos, rating, delivery time and delivery fee.
- Mobile sticky address/search, hero promotions, cuisine carousels, recommended food, favorite kitchens, reordered food, sticky bottom navigation.
- Kitchen profile with cover photo, rating, delivery/pickup information, offers, menu search and sticky cuisine/category tabs.
- Product detail modal/bottom sheet with food photo, detailed description, required variants, optional extras, frequently-bought-together, quantity and special instructions.
- Single-kitchen cart, quantity controls, add-more flow, offers, order summary and checkout.
- COD-only checkout: address + customer map pin, delivery option, transparent food/delivery/service fees, optionally tip, coupon, place order.
- Tracking, support, order history, reviews, reordering, favorites.

## Merchant portal (independent UI)
- Account and kitchen application, fixed map location needing admin approval.
- Order queue/KDS with new, accepted, preparing, ready, picked up states.
- Category and food item CRUD, food photo bucket uploads, variants/addons, active/sold-out, schedule, promotions, staff and sales/settlements.
- Kitchen-specific commission percentage visible to merchant; only authorized admin changes it.

## Admin portal (independent UI)
- Secure RBAC; kitchen application approvals, fixed location verification, kitchen commission overrides and audit trails.
- Manual rider assignment and live dispatch map; order/customer/rider support and exception handling.
- Delivery zone/rate management, banners/coupons, merchant and rider operations.
- COD collection, rider deposits, platform commission, merchant payable, double-entry ledger, settlement and reports.

## Rider mobile portal and later native app
- Admin-assigned deliveries only; pickup and destination navigation, order status and proof of delivery.
- Live GPS with explicit permission while on active orders; native rider app needed for reliable background tracking.
- COD amount, verified cash collection, deposit, rider income and shift management.

## Platform safeguards
- Each kitchen has custom percentage commission on food subtotal, separate from customer-facing platform/service fees.
- Merchant fixed-location changes need admin review.
- COD only for initial launch; one kitchen per order.
- Private Railway S3-compatible bucket; validate uploads and permission-check media.
- Require migrations, authorization, OTP and abuse prevention, CSRF controls and tests before production transactions.

## Delivery sequence
1. Responsive branded customer storefront design and isolated role layouts.
2. Review/run Prisma migrations; secure registration and merchant approval; persistent dynamic menu and bucket uploads.
3. Customer discovery, menu, customizable products, cart and COD checkout.
4. Dispatch/rider tracking.
5. Cash ledger, merchant settlement, reports and app-ready APIs.
