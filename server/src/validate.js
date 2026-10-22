// Input validation for everything a client can send. Never trust the browser.

import { CATEGORIES, GENDERS, MODES, WANTS } from "./config.js";

const INTEREST_STRIP = /[^\p{L}\p{N} _-]/gu;

export function normalizeInterests(input, { maxInterests, maxInterestLength }) {
  if (!Array.isArray(input)) return [];
  const out = new Set();
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const tag = raw.normalize("NFKC").toLowerCase().replace(INTEREST_STRIP, "").replace(/\s+/g, " ").trim().slice(0, maxInterestLength);
    if (tag) out.add(tag);
    if (out.size >= maxInterests) break;
  }
  return [...out];
}

/** Validate a `join` payload. Returns { ok: true, value } or { ok: false, error }. */
export function parseJoin(payload, limits, { videoEnabled = false } = {}) {
  if (!payload || typeof payload !== "object") return { ok: false, error: "bad_request" };
  const { gender, want, category, mode, interests, ageConfirmed, verifyToken } = payload;

  if (ageConfirmed !== true) return { ok: false, error: "age_confirmation_required" };
  if (!GENDERS.includes(gender)) return { ok: false, error: "invalid_gender" };
  if (!WANTS.includes(want)) return { ok: false, error: "invalid_want" };
  if (!MODES.includes(mode)) return { ok: false, error: "invalid_mode" };
  const cat = CATEGORIES.find((c) => c.id === category);
  if (!cat) return { ok: false, error: "invalid_category" };
  if (cat.textOnly && mode !== "text") return { ok: false, error: "category_text_only" };
  if (mode === "video" && !videoEnabled) return { ok: false, error: "video_disabled" };

  return {
    ok: true,
    value: {
      gender,
      want,
      category,
      mode,
      interests: normalizeInterests(interests, limits),
      verifyToken: typeof verifyToken === "string" ? verifyToken.slice(0, 2048) : null,
      gated: Boolean(cat.gated),
    },
  };
}

export const REPORT_REASONS = ["underage", "sexual_content", "harassment", "spam", "other"];
