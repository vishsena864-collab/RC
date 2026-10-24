// Vercel temporary WebSocket entry point. Railway continues using src/index.js directly.
// Instance-local matchmaking is temporary: reconnects and cross-instance room state need
// shared storage before this can be considered a production-scale realtime backend.
import { createApp } from "../src/index.js";
const app = createApp();
export default app.httpServer;
