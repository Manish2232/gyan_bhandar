This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

## Gyan Bhandar

A shared library for notes, discoveries, and useful things worth passing on. The app uses Next.js App Router, TypeScript, PostgreSQL, Prisma, Zod, opaque database-backed sessions, and Upstash rate limits.

### Requirements

- Node.js 20.19 or newer
- npm 10 or newer
- Docker with Compose, or a PostgreSQL 15+ database
- An Upstash Redis REST database for production rate limiting

### Local Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set the seed-owner password to a unique value of at least 12 characters. Keep `.env` out of source control.
3. Start the local database with `docker compose up -d db`, or point `DATABASE_URL` at an existing PostgreSQL database.
4. Generate the Prisma client with `npm run db:generate`.
5. Apply the checked-in migration with `npm run db:migrate`.
6. Add the sample curator and public library notes with `npm run db:seed`.
7. Start the app with `npm run dev`, then open <http://localhost:3000>.

The development server uses a process-local rate limiter when Upstash credentials are absent. That fallback is only suitable for local development; production fails closed unless both Upstash variables are configured.

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

- `src/app`: public pages, authentication pages, dashboard, resource editor/detail, and REST route handlers.
- `src/components`: reusable auth, navigation, and resource-editor components.
- `src/lib`: Prisma client, validation, sessions, rate limiting, request helpers, and browser API client.
- `src/services`: authentication and resource persistence rules.
- `prisma/schema.prisma`: PostgreSQL models; migrations are checked into `prisma/migrations`.
- `prisma/seed.ts`: repeatable curator and resource seed data.
- `docs/api.md`: REST contract, access rules, and error format.

Authentication uses a random 256-bit opaque token in an HTTP-only, same-site cookie. Only its SHA-256 hash is stored in PostgreSQL; sessions expire after 30 days and are revoked on sign-out. Passwords are hashed with bcrypt. Resource writes require a valid session, same-origin request, validated input, and owner match.

### Security Notes

- Never commit `.env` or production secrets. `.env.example` contains placeholders only.
- Production write requests must match `NEXT_PUBLIC_SITE_URL`; configure the public canonical origin exactly.
- Configure Upstash before exposing the service. Rate-limit outages fail closed with a temporary-service error.
- Terminate TLS at a trusted proxy/platform and configure it to sanitize forwarded headers.
- The sample curator password is never hard-coded; the seed requires `SEED_OWNER_PASSWORD` from the environment.

### License

No license has been selected for this project yet.
