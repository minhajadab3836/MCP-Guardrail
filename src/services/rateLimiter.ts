import { UserTier } from '../types.js';

interface BucketConfig {
  capacity: number;
  refillRatePerSec: number;
}

interface BucketState {
  tokens: number;
  lastRefillTimestamp: number;
}

// Tier configs: (Capacity, Refill rate per second)
const TIER_LIMITS: Record<UserTier, { default: BucketConfig; execution: BucketConfig }> = {
  free: {
    default: { capacity: 10, refillRatePerSec: 1 },    // 10 burst, 1 req/sec
    execution: { capacity: 3, refillRatePerSec: 0.2 },  // Tight limits on tools/call (1 per 5s)
  },
  pro: {
    default: { capacity: 30, refillRatePerSec: 5 },
    execution: { capacity: 15, refillRatePerSec: 2 },
  },
  enterprise: {
    default: { capacity: 100, refillRatePerSec: 20 },
    execution: { capacity: 50, refillRatePerSec: 10 },
  },
};

export class RateLimiterService {
  private static buckets: Map<string, BucketState> = new Map();

  /**
   * Consumes tokens for a client request.
   * Returns metadata indicating if the request is allowed and retry duration.
   */
  public static consumeToken(clientId: string, tier: UserTier, isExecutionMethod: boolean): {
    allowed: boolean;
    retryAfterSeconds: number;
    remainingTokens: number;
  } {
    const config = isExecutionMethod
      ? TIER_LIMITS[tier].execution
      : TIER_LIMITS[tier].default;

    const bucketKey = `${clientId}:${isExecutionMethod ? 'exec' : 'meta'}`;
    const now = Date.now();

    let state = this.buckets.get(bucketKey);

    if (!state) {
      state = {
        tokens: config.capacity,
        lastRefillTimestamp: now,
      };
    } else {
      // Calculate token refill based on elapsed time
      const elapsedSeconds = (now - state.lastRefillTimestamp) / 1000;
      const tokensToAdd = elapsedSeconds * config.refillRatePerSec;
      state.tokens = Math.min(config.capacity, state.tokens + tokensToAdd);
      state.lastRefillTimestamp = now;
    }

    if (state.tokens >= 1) {
      state.tokens -= 1;
      this.buckets.set(bucketKey, state);
      return {
        allowed: true,
        retryAfterSeconds: 0,
        remainingTokens: Math.floor(state.tokens),
      };
    }

    // Calculate wait time until at least 1 token is available
    const missingTokens = 1 - state.tokens;
    const retryAfterSeconds = Math.ceil(missingTokens / config.refillRatePerSec);

    this.buckets.set(bucketKey, state);
    return {
      allowed: false,
      retryAfterSeconds,
      remainingTokens: 0,
    };
  }
}

