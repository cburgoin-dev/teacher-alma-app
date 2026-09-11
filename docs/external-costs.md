# External Costs (Provisional)

Last reviewed: 2026-09-11.

This document is for planning and quoting only. Prices, free tiers and app-store policies can change. Re-check all numbers immediately before presenting a final commercial quote or publishing the app.

## Purpose

Separate:

- **development cost**: design, programming, testing, deployment and implementation work;
- **external/operational cost**: infrastructure, app-store accounts, domains, payment commissions, video/storage services and other third-party services.

Recurring production accounts should ideally end up under Alma/the business rather than remain permanently tied to the developer's personal billing accounts.

## Current planning assumptions

### Database / Auth / Storage

Candidate: **Supabase Pro**.

Planning estimate:

- About **US$25/month**.
- Useful as a starting production tier for PostgreSQL/Auth/Storage quotas.

Notes:

- The final infrastructure decision is not locked.
- Supabase can be used as infrastructure while Node/Express remains the business/API layer.

### Node.js / Express API hosting

Candidate: **Render** or equivalent small always-on service.

Planning estimate:

- From roughly **US$10/month** for a small production instance.

Notes:

- Development/free environments may reduce cost before launch.
- Actual memory/CPU requirements should be measured after implementation.

### Expo / EAS

Candidate: Expo EAS.

Planning estimate:

- Free tier can be enough during early development.
- Optional paid Starter tier: roughly **US$19/month** if build priority/limits justify it.

Do not assume a paid EAS plan is mandatory for MVP launch.

### Transactional email

Candidate: **Resend** or equivalent.

Planning estimate:

- Free tier may cover early usage.
- Paid tier around **US$20/month** if volume grows.

Potential uses:

- account/auth emails when needed;
- purchase/access notifications;
- future communication flows.

### Images / general object storage

Candidate: Supabase Storage or **Cloudflare R2**.

Planning estimate for R2:

- Free allowance can cover small early usage.
- Storage beyond allowance is inexpensive (approximately US$0.015/GB-month under current pricing).

Final provider depends on how media is organized and served.

### Video hosting / streaming

Candidate: **Mux** or another dedicated video platform.

Planning assumption:

- Early delivery/storage may be very low-cost or remain within introductory/free usage thresholds.
- Mux currently advertises a significant free delivery allowance and low per-minute storage pricing.

Important:

- Alma's lesson videos may become one of the main variable infrastructure costs if audience/watch time grows.
- Do not store/serve large production videos directly from the API server.

### Domain

Planning estimate for a `.com`:

- Roughly **US$11-18/year**, depending on registrar and renewal price.

A domain is more relevant when a public/commercial website or branded backend/web endpoints are launched.

### Google Play developer account

Planning estimate:

- **US$25 one-time** registration fee under current Google Play policy.

Prefer the production account to belong to Alma/the business when appropriate.

### Apple Developer Program

Planning estimate:

- **US$99/year** under current Apple pricing.

Required for normal App Store distribution on iOS.

### Mobile digital purchases / subscriptions

For digital content inside the mobile app, plan around native store billing:

- Apple In-App Purchase.
- Google Play Billing.

The stores generally charge a percentage of digital sales rather than a fixed monthly gateway fee. Exact commissions depend on program, product type, revenue and current policies.

Do not assume an external card gateway such as Stripe can simply replace required app-store billing for in-app digital content.

### RevenueCat (optional)

Candidate for unified subscription/purchase entitlement handling across iOS and Android.

Planning assumption:

- Free while tracked revenue remains below the current free threshold.
- Current paid model begins as a percentage of tracked revenue after that threshold (around 1% under current published pricing).

RevenueCat is optional but may substantially simplify receipt validation, entitlement restoration and cross-platform purchase state.

### Stripe (future web purchases)

Stripe may make sense later for a website/web checkout rather than as the primary mobile digital-content mechanism.

Current Mexico planning reference:

- Approximately **3.6% + MXN $3** per successful domestic-card transaction under published standard pricing.

Re-check before implementation/quotation.

## Rough early-production budget

A small initial production setup could plausibly land around:

- **MXN $600-1,000/month** for core fixed infrastructure when using paid database/backend hosting and keeping other services in free/low tiers.
- Approximately **MXN $900-1,500/month** if optional paid build/email/other services are added.

These are planning ranges, not guarantees. Video consumption, AI APIs, user growth, storage and bandwidth can raise operating costs.

## Publication / setup costs

Approximate first-year planning bucket:

- Google Play registration.
- Apple Developer Program.
- Domain.

Together, these are roughly in the **low-thousands of MXN for year one** before taxes/exchange-rate changes, excluding infrastructure subscriptions.

## Quotation guidance

For the final commercial quote, present third-party costs separately from development work.

Suggested structure:

1. **Application development**
   - requirements/product design;
   - mobile frontend;
   - backend/API;
   - database;
   - integrations;
   - testing;
   - deployment/publication support.

2. **Third-party setup / launch costs**
   - developer accounts;
   - initial infrastructure;
   - domain if applicable;
   - payment/subscription setup.

3. **Ongoing operating costs**
   - hosting/database;
   - video/storage;
   - payment/store commissions;
   - optional email/build/analytics/AI services.

Do not bundle unlimited future third-party expenses into a fixed development price unless a clear duration/usage cap is stated.

## Items still not fixed

- Final database/infrastructure provider.
- Final API hosting provider.
- Final video provider.
- Whether the MVP launches with subscription, course purchase or a hybrid model.
- Whether RevenueCat will be used.
- Whether a public website launches alongside or after the mobile MVP.
- AI provider/use cases and resulting token/API cost.

These should be revisited after MVP scope and monetization are finalized.
