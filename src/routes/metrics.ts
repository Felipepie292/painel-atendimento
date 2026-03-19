import type { FastifyInstance } from 'fastify';
import { getMetrics } from '../services/storage.js';

const metricsQuerySchema = {
  type: 'object',
  properties: {
    period: { type: 'string', enum: ['today', '7days', '30days'] },
  },
  additionalProperties: false,
} as const;

/**
 * Registers metrics-related routes.
 *
 * - GET /api/metrics          — returns dashboard metrics (defaults to today)
 * - GET /api/metrics?period=  — returns metrics filtered by period
 */
export async function metricsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/metrics
   * Returns aggregated metrics for the dashboard.
   * Accepts optional `period` query param: 'today', '7days', or '30days'.
   */
  fastify.get<{ Querystring: { period?: 'today' | '7days' | '30days' } }>(
    '/metrics',
    {
      schema: {
        querystring: metricsQuerySchema,
      },
    },
    async (request, reply) => {
      try {
        const metrics = await getMetrics(request.query.period);
        return reply.send(metrics);
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno do servidor' });
      }
    },
  );
}
