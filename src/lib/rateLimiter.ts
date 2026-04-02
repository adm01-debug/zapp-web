/**
 * Simple client-side rate limiter using sliding window.
 * Prevents abuse of API calls from the frontend.
 */
export class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if a request is allowed. Returns true if within limits.
   */
  tryAcquire(): boolean {
    const now = Date.now();
    // Remove expired timestamps
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);

    if (this.timestamps.length >= this.maxRequests) {
      return false;
    }

    this.timestamps.push(now);
    return true;
  }

  /**
   * Get the time in ms until the next request is allowed.
   * Returns 0 if a request is currently allowed.
   */
  getRetryAfter(): number {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);

    if (this.timestamps.length < this.maxRequests) return 0;

    const oldest = this.timestamps[0];
    return Math.max(0, this.windowMs - (now - oldest));
  }

  reset(): void {
    this.timestamps = [];
  }
}
