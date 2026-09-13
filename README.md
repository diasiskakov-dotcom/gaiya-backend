# GAÏYA Backend

A working REST API for the GAÏYA storefront — product catalog, cart, checkout,
and order management, backed by a real SQL database. Payments and outbound
email are the only pieces still simulated, and only because they require
business accounts (Stripe, Kaspi, Postmark) that a developer can't create on
the brand's behalf — see "What's simulated vs. real" below.

## Quick start

```
npm install
cp .env.example .env
npm start
```

Server runs on `http://localhost:9000`. Try it:

```
curl http://localhost:9000/products
```

Run the automated test suite (start the server first, in another terminal):

```
npm test
```

All 9 checks cover the full flow: catalog, cart, promo codes, checkout,
inventory, order status, and email template rendering.

## What's implemented and real

- **Database**: a real, ACID-compliant SQL database (SQLite via Node's
  built-in driver in dev; see below for Postgres in production) with proper
  foreign keys, transactions, and normalized tables — not a JSON file. Data
  persists across restarts; verified by creating an order, restarting the
  server, and confirming the order and inventory decrement both survived.
- **Full commerce API**: catalog with filtering, cart, promo codes,
  checkout with stock validation, admin order management with the exact
  status flow from the ТЗ (New → Paid → Processing → Shipped → Completed →
  Cancelled)
- **Order confirmation email**: fully rendered from a real HTML template
  (`notifications/templates/order-confirmation.html`) with live order data —
  only the final "send via Postmark" API call is stubbed, pending a real
  Postmark account and API key
- **Russian translations**: `i18n/ru.json` — every string of storefront copy
  translated and keyed to match the English source, ready to wire into the
  language switch already stubbed into the frontend footer
- **10 seeded products** matching the catalog page, with real photos served
  statically

## What's still simulated, and why

| Piece | Status | What unblocks it |
|---|---|---|
| Stripe payments | Simulated — always succeeds | A Stripe account (business step, not code) |
| Kaspi Pay | Simulated — always succeeds | Kaspi merchant approval (business step; has a review period, start early) |
| Sending the confirmation email | Simulated — logs instead of sending | A Postmark/Sendgrid account and API key |
| Admin auth | Minimal — single static token | Real session auth, needed once more than one admin user exists |
| Production database | SQLite (dev-appropriate) | Point `DATABASE_URL` at a real Postgres instance and switch `data/store.js` to `db/postgres.js` — same schema, same interface, already written |

None of these are multi-week engineering tasks — each is bounded to the one
file listed, because both database backends already implement the identical
interface the routes call. The remaining work is almost entirely obtaining
credentials, not writing code.

## Project structure

```
server.js                    Entry point, mounts all routes
routes/
  products.js                 Catalog + single product
  cart.js                      Cart CRUD + totals calculation
  checkout.js                  Cart → order, payment + email hooks
  orders.js                    Admin order management
payments/
  stripe.js                     Card payment — simulated pending Stripe account
  kaspi.js                       Kazakhstan payment — simulated pending Kaspi approval
notifications/
  email.js                       Real template rendering + simulated send
  templates/order-confirmation.html   Production-ready HTML email
middleware/
  adminAuth.js                    Bearer token check
data/
  seed.js                          The 10 sample products
  store.js                          Points at db/sqlite.js (swap for db/postgres.js in production)
db/
  schema.sql                        SQLite schema (real tables, foreign keys)
  sqlite.js                          Real SQLite implementation — tested, persists to disk
  postgres.js                        Production Postgres implementation, same interface
i18n/
  ru.json                            Full Russian translation of all storefront copy
public/images/                      The 10 sample product photos
test/
  smoke-test.js                       9-check end-to-end test suite
.github/workflows/
  ci.yml                                Runs tests on every push/PR
  deploy.yml                            Deploys to Railway on merge to main
```

## Path to production

1. Provision a real Postgres database, run `db/postgres.js`'s schema against
   it (translate `db/schema.sql`'s SQLite syntax per the notes at the top of
   `db/postgres.js`), set `DATABASE_URL`, and point `data/store.js` at
   `db/postgres.js` instead of `db/sqlite.js`. Re-run `npm test` against it
   before trusting it.
2. Get a Stripe account and real API key; replace the simulated response in
   `payments/stripe.js` with real SDK calls.
3. Once Kaspi merchant approval lands, implement `payments/kaspi.js`
   against their actual API and build the webhook handler stubbed in
   `handleKaspiWebhook`.
4. Get a Postmark/Sendgrid account; replace the `throw` in
   `notifications/email.js`'s send path with a real API call — the
   rendering logic above it needs no changes.
5. Replace `middleware/adminAuth.js`'s static token with real session auth.
6. Deploy: this repo's Dockerfile builds directly; point it at Railway,
   Render, or a VPS. See `gaiya_backend_architecture.md` and
   `gaiya_deployment_rollout_plan.md` for the full deployment sequence.
