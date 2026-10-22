# Contributing to ChatSpark ✳

We welcome improvements to accessibility, animations, privacy, moderation, localization, and Movie Rush.

1. Create a feature branch; avoid committing `.env`, service keys, log files, or user-generated chat content.
2. Install Node.js 22.16+ (24 recommended), then run `npm ci` separately in `server/` and `web/`.
3. Run `cd server && npm test` and `cd web && npm run build` before submitting changes.
4. Keep translations consistent across `web/lib/dictionaries/`.
5. Respect `prefers-reduced-motion`; animations must be optional for accessibility.
6. Changes to guessing logic, reports, identity or moderation must include tests and a threat-model note.

Never enable video or WebRTC without a separate, deliberate privacy review.
