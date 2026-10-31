# AdPanda mobile apps — development foundation

Three **independent** Expo React Native apps:
- `mobile/apps/customer` — customer ordering app (`food.adpanda.customer`)
- `mobile/apps/rider` — rider delivery and commission app (`food.adpanda.rider`)
- `mobile/apps/merchant` — merchant order and inventory app (`food.adpanda.merchant`)

Backend is the existing `https://adpanda.food` Next.js service and Railway database.
**Production branch must remain independent of mobile work.** Do not add these folders as npm workspaces in the root web app until Railway build pipeline is updated and verified.

## Local development on Windows
Install Node 22.13+ and npm. Example:
```powershell
git fetch origin
git checkout feature/mobile-three-apps
cd mobile/apps/customer
npm install
npx expo install --fix
npx expo start
```
Repeat with `mobile/apps/rider` or `mobile/apps/merchant`.
Use Expo development builds for native location, push and camera verification; iOS binaries can be built with EAS Cloud from Windows subject to Apple signing/developer requirements.

## Architecture and rollout
1. **Mobile auth backend**: Add role-scoped bearer token endpoints, rotation/revocation, device sessions, rate-limiting and secure token storage with expo-secure-store. Never put database secrets in the app. Website cookie auth is not a mobile auth protocol. Admin stays web-only.
2. **Customer API**: kitchen/category/menu listing, guest cart, address pin, COD checkout, order lifecycle, rider tracking, optional registered customer login.
3. **Rider API**: availability + GPS freshness, request accept with single-winner locking, pickup reminders, camera evidence, failed return, COD settlement, AdPanda commission daily proof, Admin-verified next-day eligibility. Push tokens must be verified and tied to device/rider. GPS background tracking must be permissioned and tested on device.
4. **Merchant API**: owner-role access, kitchen settings, catalog image uploads, new order alerts, rider matching, parcel handover camera evidence, return-received proof, settlement verification, date-filtered earnings.
5. Build staging, end-to-end tests, then Android APK internal testing; iOS TestFlight and store release once credentials are available.

## What exists now
Native Expo project entrypoints, role-specific starter UI, app identifiers and separate project folders. **No live authentication, ordering or payments yet; buttons are deliberately non-operational placeholders.** Do not distribute as a finished app.
