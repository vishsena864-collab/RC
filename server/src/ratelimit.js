// Tiny sliding-window rate limiter. One instance per socket per action.

export class RateLimiter {
  constructor(max, windowMs, now = () => Date.now()) {
    this.max = max;
    this.windowMs = windowMs;
    this.now = now;
    this.hits = [];
  }

  /** Returns true if the action is allowed, false if the caller is over the limit. */
  take() {
    const t = this.now();
    const cutoff = t - this.windowMs;
    while (this.hits.length && this.hits[0] <= cutoff) this.hits.shift();
    if (this.hits.length >= this.max) return false;
    this.hits.push(t);
    return true;
  }
}
