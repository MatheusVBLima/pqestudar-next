# MBO Premium

`/mbo-premium` is a public interactive landing. It preserves `/mapa-dos-beneficios` and opens a dedicated Stripe Checkout directly from the commercial CTA.

The editorial sample lives in `src/lib/mbo-preview.ts`: four public examples with official source links, requirements and preparation steps. It is intentionally static and does not publish the private Premium catalog. Recheck the official sources and update `MBO_REVIEWED_AT` when changing the sample; there is no automatic source refresh.

Filtering uses coverage and interest, never legal eligibility. National programs remain visible for every state and municipality. Fortaleza is currently the only municipal example. The map uses the existing Brazil GeoJSON and indicates geographic coverage; its Fortaleza indicator is not a service address.

Checklist state is separate per benefit and lasts only for the current page visit. It stores no personal data and makes no application or eligibility decision. Exploring the public sample requires no sign-in. Purchasing uses the Stripe integration below.

Run the local server, then `node scripts/mbo-preview.test.mjs` (defaults to localhost:3000; override with `MBO_TEST_URL`). The browser test covers region/category filtering, national inclusion, modal focus, independent checklists, comparison controls, commercial link, mobile map/list controls and overflow at 320/390/820px. Captures are written to `test-results/mbo`.


## Premium lifetime checkout

- Product key: `pqestudar-premium-lifetime`.
- Production price supplied by the owner: `price_1UF5gOEfNogJi61paz25os3B`.
- BRL 59.90, one payment, lifetime Premium tier. No recurring subscription is created in Stripe.
- `POST /api/stripe/create-checkout-session` validates the configured Stripe Price (active, one-time, BRL, 5990 cents) before creating Checkout. Browser-supplied prices are ignored. Certificate checkout remains BRL 19.90.
- Guests can pay directly. Checkout asks them to use the email associated with their Google login. Existing verified users are attached using `auth.getUser()`, never an unverified client session.
- `/mbo-premium/sucesso` only displays active access after the authenticated status API sees a paid, validated purchase for that user. The redirect alone cannot grant anything.
- Google login from the receipt page stores a narrowly validated return path, returning the buyer to the receipt after OAuth.

### Configuration and deployment

Server environment: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and existing Supabase server credentials. These must never use the `NEXT_PUBLIC_` prefix. Optional `STRIPE_PREMIUM_PRICE_ID` overrides the production price for sandbox tests; create a separate one-time BRL 59.90 price in the same Stripe sandbox as the test key.

The existing endpoint `/api/stripe/webhook` handles both products. Keep its six existing events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `charge.dispute.created`.

Apply `20260913000100_stripe_premium_lifetime.sql` before publishing the app. It also adds the previously missing revocation columns required by the old webhook. New code requires the `get_effective_subscription` RPC. The production webhook signing secret and the local Stripe CLI signing secret are different; do not interchange them.

### Access and reversals

The signed webhook verifies the actual Stripe line item against the configured price before writing Premium purchases through a service-only RPC. Unpaid Pix remains pending. Database locks preserve paid status on delayed failure events, make duplicates harmless, and retain payment revocation tombstones so a refund/dispute arriving before a paid event cannot accidentally grant access later. Any refund revokes this purchase's entitlement, consistent with the existing checkout policy.

Paid purchases are separate from `subscriptions`. The effective subscription RPC overlays a lifetime Premium entitlement (ends_at sentinel in year 9999) without altering an existing annual, token, Cakto or admin-granted subscription. Revoking the Stripe purchase therefore restores the underlying access automatically. Administrative subscription lists still show the underlying subscription rows; the Stripe purchase is the source of this additional entitlement.

Unclaimed guest purchases are bound only to an authenticated account whose verified email exactly matches the checkout email. Once bound, they cannot be claimed by another user. `has_active_subscription()` includes validated, bound purchases for existing Premium RLS policies. Raw fulfillment and revocation RPCs are restricted to service_role.

### Validation

`node scripts/stripe-premium.test.mjs`: actual route handlers with mocked Stripe/Supabase; fixed price, guest flow, verified identity, Pix fallback, signature rejection, payment states, refund/dispute and Certificate regression.

`node scripts/stripe-premium-ui.test.mjs`: actual local Next UI with mocked payment/status responses; checkout error/retry and direct redirect, OAuth return link, pending/paid/refunded receipts, mobile overflow. No actual payment is made.

`supabase/tests/stripe_premium_lifetime.sql`: run inside a transaction and rollback. Covers duplicates, out-of-order events, guest email verification, preservation of existing subscription, and actual authenticated-role permissions/RLS.

A real Stripe sandbox checkout and webhook delivery remain necessary after keys are configured. No successful payment or production frontend deployment is implied by these tests.
