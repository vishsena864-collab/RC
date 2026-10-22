// Text hygiene, reports, and bans.
//
// Reports are appended to data/reports.jsonl with the last few chat lines so a human can review them.
// Bans are kept in memory and mirrored to data/bans.json so they survive a restart.

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|io|gg|link|xyz|app|info|co|me|ru|ly|site|click|online)\b/gi;

/** Clean a chat message. Returns { ok: true, text } or { ok: false, reason }. */
export function cleanMessage(raw, maxLength) {
  if (typeof raw !== "string") return { ok: false, reason: "invalid" };
  const text = raw.normalize("NFKC").replace(CONTROL_CHARS, "").replace(/\s+/g, " ").trim();
  if (!text) return { ok: false, reason: "empty" };
  if (text.length > maxLength) return { ok: false, reason: "too_long" };
  const links = text.match(URL_PATTERN);
  if (links?.length) return { ok: false, reason: "links" };
  return { ok: true, text };
}

export class Moderation {
  constructor({ dataDir, settings, now = () => Date.now() }) {
    this.settings = settings;
    this.now = now;
    this.dataDir = dataDir;
    this.reportsFile = join(dataDir, "reports.jsonl");
    this.bansFile = join(dataDir, "bans.json");
    this.bans = new Map(); // HMAC-based opaque network key -> { until, reason }
    this.reportsByIp = new Map(); // opaque key -> [{ at, reporterKey }]
    mkdirSync(dataDir, { recursive: true, mode: 0o700 });
    this.#loadBans();
    this.#saveBans(); // rewrites any legacy plaintext-IP ban file with fingerprints only
    this.pruneReports();
  }

  isBanned(ip) {
    const ban = this.bans.get(ip);
    if (!ban) return false;
    if (ban.until <= this.now()) {
      this.bans.delete(ip);
      this.#saveBans();
      return false;
    }
    return true;
  }

  ban(ip, ms, reason) {
    this.bans.set(ip, { until: this.now() + ms, reason });
    this.#saveBans();
  }

  /**
   * Record a report. Returns { banned: boolean } where banned means the reported key just crossed the
   * auto-ban threshold (distinct reporters inside the window).
   */
  report({ reporterKey, reportedKey, reason, note, category, mode, transcript }) {
    const at = this.now();
    this.#append({ at, reporterKey, reportedKey, reason, note: String(note || "").slice(0, 500), category, mode, transcript });

    // Same-network reports (two tabs on one machine, or local testing) are logged but never count toward a ban.
    if (reporterKey === reportedKey) return { banned: false };

    const list = (this.reportsByIp.get(reportedKey) || []).filter((r) => at - r.at < this.settings.reportWindowMs);
    list.push({ at, reporterKey });
    this.reportsByIp.set(reportedKey, list);

    const distinctReporters = new Set(list.map((r) => r.reporterKey)).size;
    if (distinctReporters >= this.settings.reportsToBan) {
      this.ban(reportedKey, this.settings.banMs, `auto: ${distinctReporters} reports`);
      return { banned: true };
    }
    return { banned: false };
  }

  // Reports may contain sensitive chat excerpts; expire them after a short retention period.
  // Also removes legacy raw-IP report entries during an upgrade.
  pruneReports() {
    try {
      if (!existsSync(this.reportsFile)) return;
      const cutoff = this.now() - (this.settings.reportRetentionMs || 7 * 24 * 60 * 60 * 1000);
      const raw = readFileSync(this.reportsFile, "utf8");
      const kept = raw.split("\n").filter(Boolean).filter((line) => {
        try {
          const entry = JSON.parse(line);
          return entry.at >= cutoff && /^[a-f0-9]{64}$/.test(entry.reporterKey) && /^[a-f0-9]{64}$/.test(entry.reportedKey);
        } catch { return false; }
      });
      writeFileSync(this.reportsFile, kept.length ? kept.join("\n") + "\n" : "", { mode: 0o600 });
      chmodSync(this.reportsFile, 0o600);
    } catch (err) { console.error("[moderation] could not prune reports:", err.message); }
  }

  #append(record) {
    try {
      appendFileSync(this.reportsFile, JSON.stringify(record) + "\n", { mode: 0o600 });
    } catch (err) {
      console.error("[moderation] could not write report:", err.message);
    }
  }

  #loadBans() {
    try {
      if (!existsSync(this.bansFile)) return;
      const saved = JSON.parse(readFileSync(this.bansFile, "utf8"));
      // Old records with raw addresses are deliberately discarded, not migrated.
      for (const [key, ban] of Object.entries(saved)) {
        if (/^[a-f0-9]{64}$/.test(key) && ban.until > this.now()) this.bans.set(key, ban);
      }
    } catch (err) {
      console.error("[moderation] could not read bans:", err.message);
    }
  }

  #saveBans() {
    try {
      writeFileSync(this.bansFile, JSON.stringify(Object.fromEntries(this.bans)), { mode: 0o600 });
      chmodSync(this.bansFile, 0o600);
    } catch (err) {
      console.error("[moderation] could not write bans:", err.message);
    }
  }
}
