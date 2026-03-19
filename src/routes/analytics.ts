import type { FastifyInstance } from 'fastify';
import { getAnalytics } from '../services/storage.js';

const analyticsQuerySchema = {
  type: 'object',
  properties: {
    period: { type: 'string', enum: ['today', '7days', '30days'] },
  },
  additionalProperties: false,
} as const;

/**
 * Registers analytics routes.
 *
 * - GET /api/analytics — returns full analytics data
 */
export async function analyticsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/analytics
   * Returns hourly/daily distributions, tag ranking, rates, and trend data.
   */
  fastify.get<{ Querystring: { period?: 'today' | '7days' | '30days' } }>(
    '/analytics',
    {
      schema: { querystring: analyticsQuerySchema },
    },
    async (request, reply) => {
      try {
        const analytics = await getAnalytics(request.query.period);
        return reply.send(analytics);
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno do servidor' });
      }
    },
  );
}
