// One address in front of both programs, so a single tunnel can share the whole site:
//   /socket.io/*  -> chat server (default :4000)
//   everything else -> website   (default :3000)
// Handles WebSocket upgrades too. No dependencies.
//
//   node scripts/dev-proxy.mjs            listens on :8080
//   PORT=9000 WEB_PORT=3000 API_PORT=4000 node scripts/dev-proxy.mjs

import http from "node:http";
import net from "node:net";

const PORT = Number(process.env.PORT || 8080);
const WEB = { host: "127.0.0.1", port: Number(process.env.WEB_PORT || 3000) };
const API = { host: "127.0.0.1", port: Number(process.env.API_PORT || 4000) };

const target = (url = "/") => (url.startsWith("/socket.io") ? API : WEB);

const server = http.createServer((req, res) => {
  const t = target(req.url);
  const upstream = http.request({ ...t, method: req.method, path: req.url, headers: req.headers }, (up) => {
    res.writeHead(up.statusCode, up.headers);
    up.pipe(res);
  });
  upstream.on("error", () => {
    if (!res.headersSent) res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("Bad gateway: is the website / chat server running?");
  });
  req.pipe(upstream);
});

// WebSocket: replay the handshake to the right backend, then pipe bytes both ways.
server.on("upgrade", (req, socket, head) => {
  const t = target(req.url);
  const upstream = net.connect(t.port, t.host, () => {
    let raw = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
    for (let i = 0; i < req.rawHeaders.length; i += 2) raw += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
    upstream.write(raw + "\r\n");
    if (head?.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
});

server.listen(PORT, () => console.log(`[proxy] :${PORT}  /socket.io -> :${API.port}   everything else -> :${WEB.port}`));
