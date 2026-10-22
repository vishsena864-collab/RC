// All tunables in one place. Everything can be overridden with environment variables.

import { createHmac, randomBytes } from "node:crypto";

const bool = (v, d = false) => (v === undefined ? d : /^(1|true|yes|on)$/i.test(v));
const int = (v, d) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);

export const config = {
  port: int(process.env.PORT, 4000),

  // Comma-separated list of allowed web origins (the Next.js site).
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:3000").split(",").map((s) => s.trim()),

  // Set true when running behind Railway / a load balancer so the real client IP is used for bans.
  trustProxy: bool(process.env.TRUST_PROXY, false),
  // HMAC key, never stored alongside reports. Keep stable between restarts for bans to work.
  privacyHmacSecret: process.env.PRIVACY_HMAC_SECRET || undefined,

  // Text chat only for now. Video signaling is built and tested; flip this on when the web app ships video.
  videoEnabled: false, // deliberately hard-disabled: peer-to-peer WebRTC can expose IPs

  // Adult text chat is unlocked by the required 18+ self-attestation. It can still be disabled at deployment.
  adultEnabled: bool(process.env.ADULT_ENABLED, false),

  // How long a user with interests waits for an interest match before we relax to "anyone compatible".
  relaxMs: int(process.env.MATCH_RELAX_MS, 8000),
  tickMs: int(process.env.MATCH_TICK_MS, 1000),

  // Do not re-pair two people who just talked.
  rematchCooldownMs: int(process.env.REMATCH_COOLDOWN_MS, 60_000),

  limits: {
    maxInterests: 10,
    maxInterestLength: 24,
    maxMessageLength: 1000,
    maxSignalBytes: 20_000,
    // join attempts (skips included) per window
    joinsPerWindow: int(process.env.JOINS_PER_WINDOW, 30),
    joinWindowMs: 60_000,
    // chat messages per window
    messagesPerWindow: 8,
    messageWindowMs: 5_000,
  },

  // Auto-ban: this many distinct reporters inside the window bans the reported IP.
  moderation: {
    reportsToBan: int(process.env.REPORTS_TO_BAN, 3),
    reportWindowMs: 24 * 60 * 60 * 1000,
    banMs: int(process.env.BAN_MS, 60 * 60 * 1000),
    transcriptLines: 12,
    reportRetentionMs: Math.max(1, Math.min(30, int(process.env.REPORT_RETENTION_DAYS, 7))) * 24 * 60 * 60 * 1000,
  },

  // WebRTC ICE servers handed to browsers. Add TURN for users behind strict NATs.
  ice: {
    stun: (process.env.STUN_URLS || "stun:stun.l.google.com:19302").split(",").map((s) => s.trim()),
    turnUrls: (process.env.TURN_URLS || "").split(",").map((s) => s.trim()).filter(Boolean),
    turnUsername: process.env.TURN_USERNAME || "",
    turnCredential: process.env.TURN_CREDENTIAL || "",
    // Preferred: shared secret for coturn's REST-style ephemeral credentials (see buildIceServers).
    turnSecret: process.env.TURN_SECRET || "",
  },
};

// Stickers are an allowlist of ids: the server relays an id, never arbitrary content, and the web app maps each
// id to its emoji and animation. Keep this list in step with web/lib/stickers.js.
export const STICKER_IDS = [
  "wave", "heart", "laugh", "fire", "clap", "party", "thumbs", "lovely",
  "cool", "cry", "mind", "ghost", "music", "sleepy", "cheer", "magic",
];

export const GENDERS = ["male", "female"];
export const WANTS = ["any", "male", "female"];
export const MODES = ["text", "video"];

// `gated` categories need verified adults. `textOnly` categories never allow video.
export const CATEGORIES = [
  { id: "general" },
  { id: "music" },
  { id: "bored" },
  { id: "gaming" },
  { id: "movies" },
  { id: "tech" },
  { id: "sports" },
  { id: "art" },
  { id: "adult", gated: true, textOnly: true },
];

export function buildIceServers(ice = config.ice) {
  const servers = [{ urls: ice.stun }];
  if (ice.turnUrls.length) {
    if (ice.turnSecret) {
      // coturn "use-auth-secret" ephemeral credentials: the username carries an expiry timestamp and the
      // credential is its HMAC, so nothing long-lived is ever sent to browsers. Valid for one hour.
      const username = `${Math.floor(Date.now() / 1000) + 3600}:${randomBytes(6).toString("hex")}`;
      const credential = createHmac("sha1", ice.turnSecret).update(username).digest("base64");
      servers.push({ urls: ice.turnUrls, username, credential });
    } else if (ice.turnUsername) {
      servers.push({ urls: ice.turnUrls, username: ice.turnUsername, credential: ice.turnCredential });
    }
  }
  return servers;
}
