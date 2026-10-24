# ChatSpark · Underground FM

A temporary listening-room experience for discovering independent music together.

## Shipped source
- `web/app/[locale]/underground/page.jsx` — room route.
- `web/components/UndergroundFM.jsx` + `underground-stage.css` — the live-show UI: one console per role. **Controller** sees the library carousel (with play-now / add-to-queue on every cover), Light Mode scenes + show moments, a floating cover button (the selected track, pinned on top while scrolling, one tap plays it for the room), Controller Panel, Live Queue and Next / Pass buttons all on one screen, no scrolling to find a song. **Listener** sees Shape the Vibe (three live orbs), reactions, track requests and discovery. Below 1180px the same panels become four panes (The Show / Library or Request / Lights or Vibe / Chat) behind a bottom dock with a mini player.
- `web/components/underground-fx.js` — dependency-free Canvas 2D engine: `createStage` (truss-mounted moving heads, razor-thin laser fans in haze with anamorphic flares — ported from the earlier light-show samples — haze, backlit crowd, LED wall, strobe/lightning/blackout show moments), `createOverlay` (room-wide pyro flame cannons, cryo smoke and neon vibe bursts fired for everyone when anyone votes Fire / Vibe / Chill), `createOrb` (small always-alive versions inside the vote buttons). Renders at reduced resolution, pauses with the tab, draws one still frame under reduced motion.
- `web/app/api/underground/tracks/route.js` — Audius metadata search and trending proxy (no audio relay).
- `server/src/underground.js` — ephemeral Socket.IO rooms; random assignment and DJ rotation, server-side DJ enforcement, room chat throttling, queue validation, no audio files or stored chat logs. Each connection gets an anonymous, ephemeral stage name (`luna.42`) used in chat, the controller card and queue requests.
- `web/public/underground/` — venue photography (stage + crowd, 1200/2400px WebP). The stage photo is the page backdrop, hue-tinted to the controller's light colour with live canvas lasers over it; crowd/stage crops back the panels, scene thumbnails and discover tiles. Song covers always come from Audius.
- Header and homepage link into Underground FM.
- Tests: `server/test/underground.test.js`; browser flow in `e2e/underground.e2e.mjs` (`CHROME_PATH=… SHOTS_DIR=… node underground.e2e.mjs` against web on :3000 and server on :4000).

## Cost and audio
Music streams directly from Audius to each visitor's browser. ChatSpark doesn't store, download, transcode or rebroadcast audio. Free Audius API usage limits apply. Streaming permissions remain subject to artist controls and Audius API terms.

## Required production configuration
1. Deploy the backend as a **persistent Node.js service** (Railway or equivalent) using the repository's `server/` directory and `npm ci && npm start`. Vercel Functions cannot host persistent Socket.IO channels.
2. Set backend `CORS_ORIGINS=https://chatspark-rc.vercel.app` and a stable, strong `PRIVACY_HMAC_SECRET`. Consider `TRUST_PROXY=true` only when your reverse proxy overwrites forwarded headers.
3. Set Vercel public variable `NEXT_PUBLIC_SERVER_URL=https://<your-backend-domain>`, then redeploy the Next.js frontend.
4. Optional `AUDIUS_API_KEY` on Vercel, server-side, raises API limits; discovery may work keyless under current Audius read endpoints.
5. Test with two browsers: join same room, only DJ can play, listeners can queue, leave deletes rooms when empty. Browser playback requires a user gesture on mobile.

## Known limitations
- Music synchronization uses track start timestamps and is approximate, not sample-accurate.
- No uploads or permanent audio/chat history; backend memory is cleared on restart.
- The current listening room implementation is a beta. Moderation, scalable presence, track entitlement and anti-abuse protections need validation before opening large public rooms.
- Until a live backend domain is configured, the UI offers music discovery but correctly disables live room joining.
- On 2026-10-22 the connected Railway account refused project creation: "Deploys have been paused due to an upstream issue".

See [Audius documentation](https://docs.audius.co/api/) and [API license terms](https://blog.audius.co/posts/audius-terms-of-service-update).
