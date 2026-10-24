# Temporary Vercel real-time backend

This adapter exports the existing Socket.IO HTTP server as a Vercel Function. Railway still uses `npm start` and `src/index.js`, so migration back requires only changing `NEXT_PUBLIC_SERVER_URL` and redeploying the web client.

Deploy the `server` root as a separate Vercel project (Node.js), set `CORS_ORIGINS=https://chatspark-rc.vercel.app`, `PRIVACY_HMAC_SECRET`, and point the web app's `NEXT_PUBLIC_SERVER_URL` to the new HTTPS project domain.

**Limits:** The current matcher and FM rooms are instance-local and are not safe for multi-instance routing. A Redis pub/sub + Socket.IO adapter, shared match queue, presence, and room state are required for reliable operation at scale. Vercel functions close WebSockets at their max duration; clients must reconnect and rejoin. Do not advertise as fully working until two-device matching, FM sync, rotation, and reconnect are tested.
