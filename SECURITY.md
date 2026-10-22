# Security policy

ChatSpark handles anonymous communication. Report security issues **privately** through GitHub's private vulnerability-reporting feature if enabled, or contact the repository maintainers through a private channel. Do not publish exploit steps or user data in public issues.

## Boundaries

- The website is text-only: camera, microphone and peer-to-peer WebRTC are not used.
- Chat relay servers and hosting providers still receive connection metadata. Do **not** promise that IP addresses cannot be observed by infrastructure operators.
- Never submit API keys, tokens, session cookies, `.env` files, or private messages to issues.
- Set `PRIVACY_HMAC_SECRET` and strict `CORS_ORIGINS` in your deployment environment.
- No client-side access to privileged Supabase keys or server-owned movie answers.

Supported environment: Node.js 22.16+ (24 recommended) and current patched dependencies. Security fixes should include regression tests when feasible.
