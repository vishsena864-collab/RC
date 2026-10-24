# Temporary Vercel realtime adapter — intended for Railway migration

Git repo: vishsena864-collab/RC, `server/` root.

Vercel deploy target: separate Node.js Vercel project rooted at `server`. Entry: `api/socket.js`.
Public Socket.IO path: `/api/socket`. Set frontend:
- `NEXT_PUBLIC_SERVER_URL=https://chatspark-realtime.vercel.app`
- `NEXT_PUBLIC_SOCKET_PATH=/api/realtime`

Vercel backend production environment:
- `CORS_ORIGINS=https://chatspark-rc.vercel.app,https://randomchat-indol.vercel.app`
- `TRUST_PROXY=true`
- `PRIVACY_HMAC_SECRET=<long random secret>`

**Important limitations:** Vercel Functions are not a durable always-on process. Socket.IO and the existing Matcher, Underground FM rooms, DJ turns, chat games, moderation and queues currently store their state in process memory. Separate Vercel Function instances do *not* share this state; connections are capped by Function duration. Do not describe this adapter as reliable multi-instance matchmaking, guaranteed group sync or moderation persistence. Shared state + pub/sub (Redis) and reconnection/restoration are needed before a public launch. The temporary `/tmp` moderation directory is not persistent: reports and bans must be migrated to durable storage.

Vercel WebSockets became generally available Oct 20, 2026. Verified Socket.IO upgrade and two-client FM room and anonymous matching through temporary diagnostic code on Oct 24, 2026. The test endpoint was removed after validation. Current Vercel backend uses a five-minute connection cap.

To switch to Railway later, deploy `server/` with `npm start`, set `NEXT_PUBLIC_SERVER_URL` to Railway URL, remove `NEXT_PUBLIC_SOCKET_PATH` (default `/socket.io`), and redeploy frontend.
