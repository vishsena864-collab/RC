// Temporary Vercel WebSocket entrypoint. The same createApp() remains the
// Railway-native server; no business logic is duplicated.
import { createApp } from "../src/index.js";

process.env.SOCKET_IO_PATH ||= "/api/socket";
const app = globalThis.__CHATSPARK_SOCKET_APP__ ??= createApp({dataDir:"/tmp/chatspark-moderation"});
export default app.httpServer;
