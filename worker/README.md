# KCTEC AI API

Cloudflare Worker and D1 backend for the KCTEC DeepSeek business assistant.

## Security boundary

- A customer is authenticated by an HttpOnly session cookie.
- Every customer history query binds both client_id and session_id.
- The server derives client_id from the authenticated cookie; it never trusts a client-supplied customer marker.
- Internal aggregation uses a separate admin route and is never added to a customer model request.
- DEEPSEEK_API_KEY and ADMIN_TOKEN are Worker secrets and must never be committed.

## Required configuration

1. Create a D1 database and replace REPLACE_WITH_D1_DATABASE_ID in wrangler.jsonc.
2. Apply migrations/0001_initial.sql.
3. Set Worker secrets DEEPSEEK_API_KEY and ADMIN_TOKEN.
4. Set ALLOWED_ORIGIN and COOKIE_DOMAIN to the production site.
5. Deploy the Worker, then set window.KCTEC_AI_ENDPOINT on the website to the Worker /v1/chat URL.

The admin token is an initial server-to-server control only. Before building a browser-based staff dashboard, place all /v1/admin/ routes behind Cloudflare Access and retain the audit log.

## Invite flow

The association creates a client and one-time invite through POST /v1/admin/clients. The customer redeems the invite through POST /v1/invites/redeem, receiving a secure HttpOnly cookie. This avoids treating a display name or an unverified email address as authentication.
