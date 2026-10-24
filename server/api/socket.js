// Temporary Vercel WebSocket entrypoint. The same createApp() remains the
// Railway-native server; no business logic is duplicated.
import { createApp } from "../src/index.js";

process.env.SOCKET_IO_PATH ||= "/api/socket";
const app = createApp();
export default app.httpServer;
