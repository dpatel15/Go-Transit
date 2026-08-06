# Billing (Stripe) & Super-admin

The app runs entirely on the **free plan** with no Stripe configured. Turning on
billing is additive — set the env vars below and the upgrade flow lights up.

## How it maps together
- Each **plan** (`src/lib/billing/plans.ts`) maps to a monthly **credit** allowance
  and a Stripe **Price**. Credits are the unit the generator already meters, so a
  plan change is just a new `includedMonthlyCredits` on the organization.
- **Checkout** (`/api/billing/checkout`) starts a Stripe Checkout subscription.
- **Customer portal** (`/api/billing/portal`) lets a customer change card / plan / cancel.
- **Webhook** (`/api/stripe/webhook`) keeps the DB in sync — it verifies the Stripe
  signature, is idempotent (dedupes event ids), and on renewal refills credits.

## Set it up (test mode first)
1. In the **Stripe Dashboard** (test mode), create a **Product** for each paid plan
   (Starter / Pro / Studio) with a **recurring monthly Price**. Copy each Price id
   (`price_...`).
2. Get your **Secret key** (`sk_test_...`) from Developers → API keys.
3. Add a **webhook endpoint** pointing to `https://YOUR_DOMAIN/api/stripe/webhook`,
   subscribed to at least:
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.paid`, `invoice.payment_failed`. Copy its **Signing secret** (`whsec_...`).
4. Set the env vars (on Railway → Variables, or `.env` locally):
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_STARTER=price_...
   STRIPE_PRICE_PRO=price_...
   STRIPE_PRICE_STUDIO=price_...
   ```
5. Redeploy. The `/billing` page now shows real upgrade buttons.

Use Stripe's **test cards** (e.g. `4242 4242 4242 4242`) to try a subscription end
to end. When ready, repeat with live keys.

## Security notes
- The webhook is authenticated by **signature** (HMAC-SHA256 with the signing
  secret + timestamp tolerance), not a session — verification is unit-tested.
- The Stripe secret key travels only in the server-side `Authorization` header and
  is never returned in errors or sent to the client.
- Only the **account owner** can start checkout or open the portal.

## Super-admin
Set `SUPER_ADMIN_EMAILS` to a comma-separated allowlist. Those users get an
**Admin** link to `/admin`, where you can see every studio (plan, credits,
subscription status, usage, estimated spend) and **grant credits** or **set a
plan** (for comps/support). Admin access requires this server config — it can't
be granted from the database alone — and every admin route/action re-checks it.
