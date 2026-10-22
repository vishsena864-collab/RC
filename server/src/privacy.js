// IMPORTANT: the transport must see the connection IP to communicate. This module turns it into
// an opaque abuse-protection key immediately. It cannot make visitors anonymous to the network,
// their ISP, the hosting company or a reverse proxy (which may independently log IPs).
import { createHmac, randomBytes } from "node:crypto";

export function privacyKey(secret = process.env.PRIVACY_HMAC_SECRET) {
  if (secret && Buffer.byteLength(secret, "utf8") >= 32) return Buffer.from(secret, "utf8");
  if (secret) throw new Error("PRIVACY_HMAC_SECRET must be at least 32 bytes");
  // Without a configured secret, identifiers are un-linkable after process restart. This also
  // means bans from earlier process runs cannot be enforced, so set the secret in production.
  return randomBytes(32);
}

export function anonymousNetworkKey(ip, key) {
  return createHmac("sha256", key).update(String(ip || "unknown")).digest("hex");
}
