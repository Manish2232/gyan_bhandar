# REST API

All endpoints are rooted at `/api`. Requests and responses use JSON unless noted. Errors have the shape `{ "error": { "code": "...", "message": "...", "details": [] } }`; validation errors use HTTP 422 and include field paths in `details`.

## Authentication

| Method | Endpoint | Access | Result |
| --- | --- | --- | --- |
| `POST` | `/auth/signup` | Public, same-origin | Create account and session; returns `{ user }` with HTTP 201. |
| `POST` | `/auth/login` | Public, same-origin | Verify credentials and create session; returns `{ user }`. |
| `POST` | `/auth/logout` | Same-origin | Revoke the current session; returns `{ "ok": true }`. |
| `GET` | `/auth/me` | Public | Returns `{ "user": null }` or the current safe user object. |

Sign-up accepts `name` (2-60 characters), `email`, and `password` (at least 12 characters and no more than 72 UTF-8 bytes). Sign-in accepts `email` and `password`. Sessions use the `gb_session` HTTP-only cookie; browser clients should use same-origin requests and should not read or store the token themselves.

## Resources

| Method | Endpoint | Access | Result |
| --- | --- | --- | --- |
| `GET` | `/resources` | Public | Paginated published resources. |
| `POST` | `/resources` | Signed in, same-origin | Create a resource owned by the current user; HTTP 201. |
| `GET` | `/resources/:id` | Public or owner | Read a published resource; its owner may also read a draft. |
| `PATCH` | `/resources/:id` | Owner, same-origin | Update one or more resource fields. Empty updates are rejected. |
| `DELETE` | `/resources/:id` | Owner, same-origin | Delete the owned resource; returns `{ "ok": true }`. |

Create and update fields: `title` (3-120 characters), `summary` (20-280 characters), `body` (30-20,000 characters), `category` (2-50 characters), `tags` (up to 8 strings, each 1-24 characters), and `isPublished` (boolean). Create defaults `tags` to an empty list and `isPublished` to false.

`GET /resources` supports `q` (search title, summary, and body), `category`, `page` (1-based), and `limit` (1-24, default 12). It returns `{ resources, total, page, limit, hasMore }`. Set `mine=true` to include drafts and list the authenticated user's own resources; this view ignores public search and category filters. Unpublished resources are otherwise concealed with HTTP 404.

## Limits And Errors

Authentication attempts are limited to 5 sign-ups or 8 sign-ins per 15 minutes per client address. Other reads allow 90 requests per minute; writes allow 30 per minute. Production limits use Upstash Redis and require `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

Common status codes: 400 invalid query/body encoding, 401 missing/invalid session or credentials, 403 origin rejected, 404 missing or inaccessible resource, 409 email already registered, 413 request body exceeds 128 KiB, 422 field validation failure, 429 rate limit exceeded, and 503 missing/unavailable production rate-limit configuration.

Browser mutations must send an `Origin` matching `NEXT_PUBLIC_SITE_URL` in production. The API does not enable cross-origin credentialed access.