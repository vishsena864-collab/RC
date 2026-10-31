# ChatSpark creative walls

Two **separate optional** additions to the existing random-stranger-chat site. Random Chat, Movie Rush, Same Brain, matching and other existing features are untouched.

## User-facing routes

- `/[locale]/poem-wall` — submit poems in any language, anonymous artist tag, likes, weekly leaderboard, permanent hall of fame.
- `/[locale]/graffiti-wall` — interactive HTML Canvas paint editor, public voting, fully local raw-PNG export, and a premium signed PNG card after publishing.

The homepage introduces them through **two distinct animated brand cards**, below the core chat content.

## Graffiti studio

- Spray paint, splatter, drips, neon aerosol, neon tube, marker, pencil, brush, chisel pen, rainbow brush, highlighter, eraser.
- Lines, arrows, outlined and filled rectangles/ellipses, text lettering, custom stencils, pan, eyedropper, full-wall fill.
- Native full 24-bit RGB selector, curated neon swatches, opacity slider, brush-size slider, mirror strokes.
- Wall surfaces (brick, raw concrete, factory metal, midnight black, wheatpaste).
- Three paint layers, visibility toggles, undo/redo, zoom, local PNG download.
- No uploads of photos or binary images. Posts save bounded JSON drawing commands to Supabase; rendering happens locally in the browser.

## Weekly ranking and deletion

- Each category has **its own** weekly contest (UTC Monday–Sunday).
- Users can like current entries; duplicate votes are rejected for the same browser/network.
- At **00:03 UTC each Monday**, Supabase Cron invokes `public.cs_wall_finalize()`.
- This promotes only the **five highest-liked entries from each wall** to permanent winner status. Every other entry from the expired week (including previously flagged entries) is deleted and its vote/report rows are removed.
- A lazy request-time finalization also catches missed weekly jobs.
- The archive stores the top five per category **per week**, not merely one all-time top five.
- Ratings and temporary posts still occupy database storage **during** the current weekly competition; they are not stored permanently unless they win.
- If demand grows significantly, add database size limits and a moderation review dashboard before broad launch.

## Cryptographically signed card

After Graffiti Wall publication, the Edge Function:
1. Computes SHA-256 over the submitted graffiti JSON + title and kind.
2. Stores the content digest in the published record.
3. Generates an HMAC-SHA-256 signature using a private server-only key derived with purpose separation.
4. Returns a digital proof with artwork UUID, issue timestamp, digest, signature and card serial.

The browser renders a high-resolution **1600 × 1100** branded PNG card from the exact submitted artwork strokes, artist tag and proof. There is also an online HMAC verification action. The certificate can be kept by the creator **even if their temporary entry loses and is later deleted**.

**Important:** This is a tamper-evident hash and server signature, not encryption or legal proof of authorship, identity, copyright, or ownership. Replacing or rotating the current service-role key may invalidate old cards. For long-term production use, move signing to a dedicated independent stable secret.

## Security and content controls

- The database tables `public.cs_wall_entries`, `cs_wall_votes`, `cs_wall_flags`, and `cs_wall_rate` have RLS enabled and direct privileges revoked from public/anon/authenticated.
- The **`chatspark-walls`** Supabase Edge Function is the only public API; it uses credentials available **only** in the Edge environment and is versioned in `supabase/functions/chatspark-walls/index.ts`.
- Visitors submit a self-attested 18+ and original-rights checkbox.
- Server validates input lengths, drawing op types, colors and bounded point arrays, and caps serialized art payload to about 57 KB.
- IP addresses are not stored as plaintext; rate and vote keys are HMAC-derived. Proxy-header trust and multiple users sharing a network remain limitations.
- Rate limits: 3 posts/day, 45 votes/day, and 8 reports/day per network. One vote per network per artwork, one report per network per artwork.
- Three reports from distinct networks auto-hide a submission. Moderation by reports is a **basic safeguard**, not a replacement for proactive review. Before wide public launch, add administrator review, abuse telemetry, human moderation, content policy enforcement, CAPTCHAs/anti-bot protection and an appeal process.

## Operations

- Supabase project: `lpbpjffnjbjwzdrcscko`.
- Edge function: `chatspark-walls` (JWT verification disabled intentionally for anonymous visitors; the function validates allowed Origin, enforces rate limits, and holds credentials server-side).
- Supabase cron job: `chatspark-walls-weekly-top-five` — `3 0 * * 1`.
- Vercel Next.js security policy permits `connect-src https://lpbpjffnjbjwzdrcscko.supabase.co`, but **not** arbitrary external scripts or images.
- Simple API probe: `/api/walls-health`.
- If adding another custom domain, explicitly update the Edge Function's `origins` allowlist and redeploy it.
- These walls **do not depend on Railway / the Socket.IO backend**, unlike Random Chat and Underground FM.

## Live creative battles (October 2026)

Both walls now also contain **live timed competition rooms**, without removing the existing Supabase weekly publishing, signed graffiti certificate, or archive.

- On opening either wall, a Socket.IO client connects to the Railway realtime service and joins an open creative room. Visitors can switch between **ten numbered rooms per wall** (up to **ten participants per room**). Online counters are live Socket.IO memberships.
- A room waits until **two people** have joined. Then the server selects a surprise topic, opens **seven minutes to create**, and freezes entries at the deadline. One original artwork or poem can be submitted per participant using the page's regular editor / full graffiti canvas.
- A **60-second voting round** immediately follows. All entries are displayed to the room; each participant gets **one heart for someone else's entry**, and cannot like their own. Highest vote count wins (ties share the win). An uncontested or unvoted round has no automatic winner.
- Results stay visible for **15 seconds**, then a fresh prompt and round start automatically if two or more people remain. This entire cycle is controlled by server time.
- Realtime state machine: server/src/creative-arenas.js. UI: web/components/CreativeArena.jsx and creative-arena.css. The paint studio and poem editor still support separate weekly publishing, including the retention system and signed graffiti card.

**Operational limits:** Arena content, votes and scores are **ephemeral memory only**; a Railway restart clears ongoing rounds. Each socket can vote once per round, but anonymous visitors can reconnect in another tab or change networks, so **strong vote anti-fraud is not guaranteed**. For high-stakes prizes or sustained usage, add anonymous server-issued session tokens, shared Redis state and abuse detection. Live-battle winners are not automatically added to the permanent weekly Hall of Fame.

**Routes:** /[locale]/poem-wall and /[locale]/graffiti-wall. Both use the same realtime NEXT_PUBLIC_SERVER_URL and NEXT_PUBLIC_SOCKET_PATH configuration as Underground FM.
