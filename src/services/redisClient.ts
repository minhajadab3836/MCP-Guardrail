import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
});

redisClient.on('error', (err) => {
  console.error('[Redis Client Error]:', err.message);
});

redisClient.on('connect', () => {
  console.log('[Redis Client] Connected to Redis server.');
});
