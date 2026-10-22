// In-memory matchmaking queue.
//
// Entries are bucketed by (category, mode) so a video seeker never meets a text seeker and each
// category is its own pool. Inside a bucket two entries are compatible when each person's "looking
// for" accepts the other's gender. Among compatible candidates the one sharing the most interests
// wins; ties go to whoever has waited longest.
//
// Interest rule: if both people listed interests and share none, they are only paired once either of
// them has waited `relaxMs`. Until then the matcher keeps hoping for someone with a common interest.
//
// This lives in one process. For several server replicas, move the buckets into Redis (one sorted set
// per bucket) and run the same pairing logic from a single leader or with atomic Lua scripts.

export class Matcher {
  constructor({ relaxMs = 8000, cooldownMs = 60_000, now = () => Date.now() } = {}) {
    this.relaxMs = relaxMs;
    this.cooldownMs = cooldownMs;
    this.now = now;
    this.buckets = new Map(); // bucketKey -> Map<id, entry>
    this.byId = new Map(); // id -> entry
    this.recent = new Map(); // "idA|idB" -> timestamp of last pairing
  }

  get size() {
    return this.byId.size;
  }

  has(id) {
    return this.byId.has(id);
  }

  static bucketKey(entry) {
    return `${entry.category}:${entry.mode}`;
  }

  /** Queue someone. Returns a match immediately if a compatible partner is already waiting. */
  add(input) {
    this.remove(input.id);
    // Keep the original joinedAt when someone is re-queued so they do not lose their place in line.
    const entry = { ...input, joinedAt: input.joinedAt ?? this.now() };
    const key = Matcher.bucketKey(entry);
    if (!this.buckets.has(key)) this.buckets.set(key, new Map());
    this.buckets.get(key).set(entry.id, entry);
    this.byId.set(entry.id, entry);
    return this.#tryPair(entry);
  }

  remove(id) {
    const entry = this.byId.get(id);
    if (!entry) return false;
    const key = Matcher.bucketKey(entry);
    const bucket = this.buckets.get(key);
    bucket?.delete(id);
    if (bucket && bucket.size === 0) this.buckets.delete(key);
    this.byId.delete(id);
    return true;
  }

  /** Re-check everyone still waiting (interest rules relax over time). Returns the matches made. */
  tick() {
    const matches = [];
    for (const bucket of this.buckets.values()) {
      // Oldest first so people who have waited longest get first pick.
      const waiting = [...bucket.values()].sort((a, b) => a.joinedAt - b.joinedAt);
      for (const entry of waiting) {
        if (!this.byId.has(entry.id)) continue; // already paired earlier in this tick
        const match = this.#tryPair(entry);
        if (match) matches.push(match);
      }
    }
    this.#pruneRecent();
    return matches;
  }

  #tryPair(a) {
    const bucket = this.buckets.get(Matcher.bucketKey(a));
    if (!bucket) return null;

    let best = null;
    let bestCommon = [];
    for (const b of bucket.values()) {
      if (b.id === a.id) continue;
      if (!compatible(a, b)) continue;
      if (this.#onCooldown(a.id, b.id)) continue;

      const common = commonInterests(a, b);
      const bothHaveInterests = a.interests.length > 0 && b.interests.length > 0;
      if (bothHaveInterests && common.length === 0) {
        const waited = this.now() - Math.min(a.joinedAt, b.joinedAt);
        if (waited < this.relaxMs) continue;
      }

      // More shared interests first, then whoever has waited longest.
      const better =
        !best || common.length > bestCommon.length || (common.length === bestCommon.length && b.joinedAt < best.joinedAt);
      if (better) {
        best = b;
        bestCommon = common;
      }
    }
    if (!best) return null;

    this.remove(a.id);
    this.remove(best.id);
    this.recent.set(pairKey(a.id, best.id), this.now());
    // The earlier arrival is the "initiator" who creates the WebRTC offer.
    const [first, second] = a.joinedAt <= best.joinedAt ? [a, best] : [best, a];
    return { initiator: first, other: second, common: bestCommon };
  }

  #onCooldown(idA, idB) {
    const at = this.recent.get(pairKey(idA, idB));
    return at !== undefined && this.now() - at < this.cooldownMs;
  }

  #pruneRecent() {
    const cutoff = this.now() - this.cooldownMs;
    for (const [key, at] of this.recent) if (at < cutoff) this.recent.delete(key);
  }
}

export function compatible(a, b) {
  if (a.id === b.id) return false;
  if (a.category !== b.category || a.mode !== b.mode) return false;
  return (a.want === "any" || a.want === b.gender) && (b.want === "any" || b.want === a.gender);
}

export function commonInterests(a, b) {
  const set = new Set(b.interests);
  return a.interests.filter((i) => set.has(i));
}

function pairKey(x, y) {
  return x < y ? `${x}|${y}` : `${y}|${x}`;
}
