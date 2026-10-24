# Temporary Vercel realtime adapter — intended for Railway migration

Git repo: vishsena864-collab/RC, `server/` root.

Vercel deploy target: separate Node.js Vercel project rooted at `server`. Entry: `api/realtime.js`.
Public Socket.IO path: `/api/realtime`. Set frontend:
- `NEXT_PUBLIC_SERVER_URL=https://<VERCEL_REALTIME_PROJECT>.vercel.app`
- `NEXT_PUBLIC_SOCKET_PATH=/api/realtime`

Vercel backend production environment:
- `CORS_ORIGINS=https://chatspark-rc.vercel.app,https://randomchat-indol.vercel.app`
- `TRUST_PROXY=true`
- `PRIVACY_HMAC_SECRET=<long random secret>`

**Important limitations:** Vercel Functions are not a durable always-on process. Socket.IO and the existing Matcher, Underground FM rooms, DJ turns, chat games, moderation and queues currently store their state in process memory. Separate Vercel Function instances do *not* share this state; connections are capped by Function duration. Do not describe this adapter as reliable multi-instance matchmaking, guaranteed group sync or moderation persistence. Shared state + pub/sub (Redis) and reconnection/restoration are needed before a public launch. The temporary /tmp moderation directory is not persistent: reports and bans must be migrated to durable storage.

Vercel Function WebSockets are supported starting Oct 2026, but test public WebSocket handshake before enabling the frontend. If adapter handshake fails, leave frontend untouched.

To switch to Railway later, deploy `server/` with `npm start`, set `NEXT_PUBLIC_SERVER_URL` to Railway URL, remove `NEXT_PUBLIC_SOCKET_PATH` (default `/socket.io`), and redeploy frontend.
