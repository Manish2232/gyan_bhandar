## Gyan Bhandar

A shared library for notes, discoveries, and useful things worth passing on. The app uses Next.js App Router, TypeScript, PostgreSQL, Prisma, Zod, opaque database-backed sessions, and Upstash rate limits.

### Requirements

- Node.js 20.19 or newer
- npm 10 or newer
- Docker with Compose, or a PostgreSQL 15+ database
- An Upstash Redis REST database for production rate limiting

### Local Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`; set the database URL, a unique seed-owner password, and your rotated Razorpay test key ID/secret. Keep `.env` out of source control. Set the webhook secret after creating a Razorpay webhook.
3. Start the local database with `docker compose up -d db`, or point `DATABASE_URL` at an existing PostgreSQL database.
4. Generate the Prisma client with `npm run db:generate`.
5. Apply the checked-in migration with `npm run db:migrate`.
6. Add the sample curator and public library notes with `npm run db:seed`.
7. Start the app with `npm run dev`, then open <http://localhost:3000>.

The development server uses a process-local rate limiter when Upstash credentials are absent. That fallback is only suitable for local development; production fails closed unless both Upstash variables are configured.

### Razorpay Setup

1. Revoke any API key/secret that has been shared in chat, screenshots, or source control. Generate a fresh key pair in Razorpay Test Mode and put it in `.env` as `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Never use the exposed pair.
2. Apply migrations with `npm run db:migrate`, then start the app. The public `/support` page creates Razorpay orders server-side and opens Standard Checkout.
3. In Razorpay Test Mode, add a webhook pointing to `https://your-domain.example/api/payments/webhook`, subscribe to `payment.captured`, and copy that webhook's signing secret into `RAZORPAY_WEBHOOK_SECRET`.
4. Run a test payment and confirm it appears in the Razorpay Test Mode dashboard. Test keys simulate payments and do not move real money.
5. For live payments, complete Razorpay merchant verification and bank settlement setup, generate a new Live Mode key pair, replace the test values in the deployment environment, and create the matching webhook in Live Mode. Settlements follow Razorpay's account and settlement schedule.

The server verifies Checkout's HMAC signature, fetches the payment from Razorpay, checks order/amount/currency, captures authorized payments, and records a contribution as paid only when Razorpay confirms capture. Webhooks provide asynchronous reconciliation. Card, UPI PIN, and banking credentials are entered only in Razorpay Checkout and are never handled by this app.

### Commands

- `npm run dev` starts the development server.
- `npm run lint` runs ESLint.
- `npm test` runs validation, API-route, and auth-component tests.
- `npm run build` creates the production build.
- `npm run db:migrate` applies local migrations.
- `npm run db:deploy` applies migrations in production.
- `npm run db:seed` idempotently adds local sample data for `SEED_OWNER_EMAIL`.

Before deploying, set `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN` in the deployment environment. Use a unique `SEED_OWNER_PASSWORD` only when intentionally seeding; do not run the seed command with a shared or default password in production. Run `npm run db:deploy` before starting the new application version.

### Product Structure

- `src/app`: public pages, support, authentication, dashboard, resource editor/detail, and REST handlers.
- `src/components`: reusable auth, navigation, resource-editor, and payment form components.
- `src/lib`: Prisma client, validation, sessions, rate limiting, request helpers, and server-only Razorpay client.
- `src/services`: authentication, resource persistence, order verification, and webhook reconciliation.
- `prisma/schema.prisma`: PostgreSQL models; migrations are checked into `prisma/migrations`.
- `prisma/seed.ts`: repeatable curator and resource seed data.
- `docs/api.md`: REST contract, access rules, and error format.

Authentication uses a random 256-bit opaque token in an HTTP-only, same-site cookie. Only its SHA-256 hash is stored in PostgreSQL; sessions expire after 30 days and are revoked on sign-out. Passwords are hashed with bcrypt. Resource writes require a valid session, same-origin request, validated input, and owner match.

### Security Notes

- Never commit `.env` or production secrets. `.env.example` contains placeholders only.
- Production write requests must match `NEXT_PUBLIC_SITE_URL`; configure the public canonical origin exactly.
- Configure Upstash before exposing the service. Rate-limit outages fail closed with a temporary-service error.
- Razorpay secrets must remain server-side. Rotate exposed keys, use Test Mode while developing, and never treat the Checkout callback alone as proof of payment.
- Terminate TLS at a trusted proxy/platform and configure it to sanitize forwarded headers.
- The sample curator password is never hard-coded; the seed requires `SEED_OWNER_PASSWORD` from the environment.

### License

No license has been selected for this project yet.
