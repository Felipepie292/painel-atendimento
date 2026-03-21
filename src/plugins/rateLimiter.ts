import type { FastifyInstance } from 'fastify';

interface RateEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateEntry>();

// Clean up expired entries every minute
setInterval(() => {
  const now = Date.now();
  store.forEach((v, k) => {
    if (v.resetAt < now) store.delete(k);
  });
}, 60_000);

/**
 * Registers in-memory rate limiting for POST /api/* routes.
 * Keyed by X-Api-Key header or IP address.
 * Default: 100 requests per minute.
 */
export function registerRateLimiter(
  fastify: FastifyInstance,
  limit = 100,
  windowMs = 60_000,
): void {
  fastify.addHook('onRequest', async (req, reply) => {
    if (!req.url.startsWith('/api/') || req.method !== 'POST') return;

    const key = (req.headers['x-api-key'] as string) || req.ip;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
    }
    entry.count++;
    store.set(key, entry);

    reply.header('X-RateLimit-Limit', limit);
    reply.header('X-RateLimit-Remaining', Math.max(0, limit - entry.count));
    reply.header('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > limit) {
      return reply.code(429).send({ error: 'Too many requests' });
    }
  });
}
