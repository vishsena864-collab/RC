# Security policy

ChatSpark handles anonymous communication. Report security issues **privately** through GitHub's private vulnerability-reporting feature if enabled, or contact the repository maintainers through a private channel. Do not publish exploit steps or user data in public issues.

## Boundaries

- The website is text-only: camera, microphone and peer-to-peer WebRTC are not used.
- Chat relay servers and hosting providers still receive connection metadata. Do **not** promise that IP addresses cannot be observed by infrastructure operators.
- Never submit API keys, tokens, session cookies, `.env` files, or private messages to issues.
- Set `PRIVACY_HMAC_SECRET` and strict `CORS_ORIGINS` in your deployment environment.
- No client-side access to privileged Supabase keys or server-owned movie answers.

## Controls in place

- **Web:** strict Content Security Policy (no third-party scripts, frames or forms; `frame-ancestors 'none'`), HSTS,
  `X-Content-Type-Options`, `Referrer-Policy: no-referrer`, `Cross-Origin-Opener-Policy: same-origin` and a
  restrictive `Permissions-Policy`. `connect-src`/`media-src` allow HTTPS because Audius streams redirect to rotating
  content nodes; scripts stay same-origin. `upgrade-insecure-requests` is on whenever the realtime server is HTTPS.
- **Realtime server:** Socket.IO only accepts the configured origins (including WebSocket upgrades), 64 KB message cap,
  raw IPs reduced to keyed HMAC codes, bans and reports stored with `0600` permissions and expiring automatically.
  JSON endpoints send `default-src 'none'`, `X-Frame-Options: DENY` and `no-referrer`.
- **Chat hygiene and abuse:** one-to-one and Underground FM chat share the same cleaner (control/bidi characters
  stripped, links refused); every room action is rate-limited per connection; reports from distinct people trigger
  temporary bans. See UNDERGROUND_FM.md, "Safety in rooms".
- **Walls:** the Supabase Edge Function is the only public API, with an origin allow-list, HMAC-keyed rate limits and
  input cleaning; privileged keys never reach the browser.
- **Dependencies:** `npm audit` reports no known vulnerabilities in `web`, `server` or `e2e` (checked 25 Oct 2026).
- **Known limits:** bans and reports live on the realtime server's disk, which Railway resets on redeploy; a
  shared store would make them durable. Next.js still needs `'unsafe-inline'` scripts until a nonce-based CSP is adopted.

Supported environment: Node.js 22.16+ (24 recommended) and current patched dependencies. Security fixes should include regression tests when feasible.
