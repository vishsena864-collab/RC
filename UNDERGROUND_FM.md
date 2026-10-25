# ChatSpark · Underground FM

A temporary listening-room experience for discovering independent music together.

## Shipped source
- `web/app/[locale]/underground/page.jsx` — room route.
- `web/components/UndergroundFM.jsx` + `underground-stage.css` — the live-show UI: one console per role. **Controller** sees the library carousel (with play-now / add-to-queue on every cover), Light Mode scenes + show moments, a floating cover button (the selected track, pinned on top while scrolling, one tap plays it for the room), Controller Panel, Live Queue and Next / Pass buttons all on one screen, no scrolling to find a song. **Listener** sees Shape the Vibe (three live orbs), reactions, track requests and discovery. Below 1180px the same panels become four panes (The Show / Library or Request / Lights or Vibe / Chat) behind a bottom dock with a mini player.
- `web/components/underground-fx.js` — dependency-free Canvas 2D engine: `createStage` (truss-mounted moving heads, razor-thin laser fans in haze with anamorphic flares — ported from the earlier light-show samples — haze, backlit crowd, LED wall, strobe/lightning/blackout show moments), `createOverlay` (room-wide pyro flame cannons, cryo smoke and neon vibe bursts fired for everyone when anyone votes Fire / Vibe / Chill), `createOrb` (small always-alive versions inside the vote buttons). Renders at reduced resolution, pauses with the tab, draws one still frame under reduced motion.
- `web/app/api/underground/tracks/route.js` — Audius metadata search and trending proxy (no audio relay).
- `server/src/underground.js` — ephemeral Socket.IO rooms; random assignment and DJ rotation, server-side DJ enforcement, room chat throttling, queue validation, no audio files or stored chat logs. Each connection gets an anonymous, ephemeral stage name (`luna.42`) used in chat, the controller card and queue requests.
- `web/public/underground/` — venue photography (wide stage + crowd at 1200/2400px, tall stage-portrait at 800/1300px for phones, WebP). The stage photo is the page backdrop, hue-tinted to the controller's light colour with live canvas lasers over it; crowd/stage crops back the panels, scene thumbnails and discover tiles. Song covers always come from Audius.
- `web/public/underground/orbs/` — energy-globe video loops (fire, vibe, chill, room; 480px and 320px H.264, 9s seamless crossfaded loop, no audio, posters) on the vote buttons and the Room Reactor. Black drops out with `mix-blend-mode:screen`, so hover/press/disabled effects sit on the `<video>` itself, never on an ancestor. Paused off-screen and under reduced motion.
- Music-driven light: Audius streams send CORS headers, so the audio element is routed through a Web Audio analyser on first play. Bass/mid/high levels, kick onsets and drops drive beam intensity, laser opening, drop blinders, a peak-heat strobe (max 3 flashes/s) and the Now Playing spectrum; `--bass` breathes the globes and cover. Devices not playing audio follow the room BPM. A vote tints the rig (fire hot/fast, chill blue/slow, vibe magenta) for ~3.5s.
- More light: four extra rigs (`cone` laser tunnel, `matrix` beam grid, `chase` LED batten chase, `follow` follow spots) as Light Mode scenes; music-reactive content (spectrum / kick rings / marquee, plus side-screen VU) mapped onto the LED screens of the venue photo via a shared `photoFit` placement; a tileable value-noise haze that beams are masked through, plus god rays from behind the DJ (full-quality devices only); and every ❤️🔥✨🌊 reaction fires a matching light (crossing pink beams, truss flames, sparkle burst, cyan wave).
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

## Controller handover
- The song is room state: nobody leaving stops it. LEAVE ROOM hands the aux to another listener at once (chat shows "♛ name has the aux now").
- A refresh or dropped connection holds the controller seat for 15s (`fmDjHoldMs`); the same tab (per-tab key in sessionStorage) rejoins automatically, gets the aux back with the same stage name, and its queue is kept. An empty room is held too, and random joiners are never placed into a held empty room. If the controller does not return, the aux passes on.
- Queued songs advance on the server: any listener whose audio ends reports `fm:ended`, and a 1s timer advances overdue tracks, so the set continues even when the controller's device is silent.
- Joining (or returning after a refresh) starts the room's song at its current position once the stream can play; if the browser blocks autoplay, a notice asks for one tap.

## Reconnects and invite links
- A dropped realtime connection (e.g. the Vercel adapter's 5-minute function cap, a restart, mobile backgrounding) no longer clears the room: the song keeps playing, the LIVE badge reads RECONNECTING…, and the client rejoins the same room code with a snapshot (track, start time, lights). If the server lost the room it is rebuilt from that snapshot; a snapshot never overrides a room that still exists.
- The room code is kept in the URL (`?room=STATIC`). INVITE copies/shares it; opening it joins that room.

## Room chat and the queue

The chat reads like a messenger: your own lines are lime bubbles on the right, lines from one person within two
minutes group together, the controller's lines glow, requests show as song cards and system notes as dividers.
The header shows who is in the room (`people` in `fm:state`) and the next queued song. Typing sends `fm:typing`
(at most every 1.5 s per person; the server relays it to the others). When new lines arrive while someone is
reading older ones, a "new messages" button takes them back down instead of yanking the scroll.

Emoji are neon: a small hand-drawn set of twelve glowing-tube SVGs in `web/public/underground/neon` (about 50 KB in
all) drawn to match the light show. `web/lib/emoji.js` swaps those emoji (and close relatives such as 🤣 or 🥰) in
messages for the neon version; a line of one to three of them is shown big without a bubble. They flicker on like a
sign being switched on and their glow breathes; reduced motion keeps them still. Four reactions (heart, fire, party,
raised hands; 700 ms cooldown per person) pop with a burst and float up the chat with the sender's name.

The queue plays itself: when a song ends the server starts the next one (`fm:ended`, with a timer as backup),
and every device that was already listening keeps playing the new song without another tap. A song requested or
queued while the room is silent (nothing loaded, or the last song ran out) starts at once.

## Fresh mixes and DJ crossfades

The crates never show the same list twice. `/api/underground/tracks` (without a typed search) mixes several Audius
feeds per page: this week's and this month's trending, underground trending, all-time classics at a random depth,
"feeling lucky" random finds and two random genres. `web/lib/mix.js` shuffles each feed with a seed the page picks
on every load, drops repeated songs and artists, and deals the feeds two songs at a time in turn. The genre tabs
(Electronic, House, Techno, Hip-Hop, Bass, Chill, Pop, Indie) mix that genre family's charts the same way, and
NEW MIX reshuffles. Typed searches stay plain Audius searches. Everything is still Audius (artist-uploaded,
streamed through Audius); chart music from major labels is not available legally for free.

Songs blend like a DJ set: the server starts the next queued song `crossfadeMs` (8 s, `fmCrossfadeMs`) before the
current one ends (clips shorter than three crossfades wait for their end), and each listening device plays the new
song on its second audio deck while the old one fades out on equal-power curves. With nothing queued, the
controller's device picks the next song from the crates in time to mix into it.

## Auto light show

When a song starts, one browser (the controller first, listeners after a short random delay) downloads the
Audius stream once, decodes it and runs `web/lib/cues.js` in a Worker. It finds the tempo, beat grid, bar-level
sections (intro, groove, build, drop, break, outro) and the drops. The first valid cue sheet goes to the room
server (`fm:cues`), which validates it, keeps it for the current track only and sends it to everyone, including
late joiners. Each browser then runs the lights against the song clock: sweeps and risers in builds, a
half-beat blackout and a new rig on each drop, slow blooms and extra haze in breakdowns, and flares every
32 beats. Light Mode scenes still set colours; the AUTO SHOW toggle in Light Mode switches it off for the room.
Anyone can also press LIGHTS OFF in the top bar. That only affects their own browser (saved in localStorage):
the rig, strobes, flashes and beat pulses stop, while the music, chat and reactor keep working.

Nothing is stored or uploaded except the small cue sheet. The CSP allows `connect-src https:` (Audius redirects
to rotating content nodes) and `worker-src blob:` (the Worker is built from our bundled analyser). Run the
analyser tests with `cd web && node --test lib/cues.test.mjs`.

## Known limitations
- **Serverless hosting splits rooms.** On the temporary Vercel adapter each function instance has its own rooms in memory, so two people can still land in different copies of the "same" room. Reconnect + invite links soften this; a single always-on server (Railway, `server/railway.json`) or shared state (Redis) fixes it.
- Music synchronization uses track start timestamps and is approximate, not sample-accurate.
- No uploads or permanent audio/chat history; backend memory is cleared on restart.
- The current listening room implementation is a beta. Moderation, scalable presence, track entitlement and anti-abuse protections need validation before opening large public rooms.
- Until a live backend domain is configured, the UI offers music discovery but correctly disables live room joining.
- On 2026-10-22 the connected Railway account refused project creation: "Deploys have been paused due to an upstream issue".

See [Audius documentation](https://docs.audius.co/api/) and [API license terms](https://blog.audius.co/posts/audius-terms-of-service-update).
