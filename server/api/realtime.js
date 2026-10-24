// Vercel WebSocket Function entry point. Portable Socket.IO application remains in src/index.js.
// This is a temporary deployment adapter; Railway uses npm start directly.
import { createApp } from "../src/index.js";

const app = globalThis.__CHATSPARK_REALTIME_APP__ ??= createApp({dataDir:"/tmp/chatspark-moderation"});
export default app.httpServer;
