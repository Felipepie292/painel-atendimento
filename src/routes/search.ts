import type { FastifyInstance } from 'fastify';
import { searchMessages } from '../services/storage.js';

const searchQuerySchema = {
  type: 'object',
  required: ['q'],
  properties: {
    q: { type: 'string', minLength: 2, maxLength: 500 },
  },
  additionalProperties: false,
} as const;

/**
 * Registers search-related routes.
 *
 * - GET /api/search?q=query — search messages across all conversations
 */
export async function searchRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/search
   * Searches messages across all conversations.
   * Requires a `q` query parameter with at least 2 characters.
   * Returns an array of { conversation_id, name, message, timestamp }.
   */
  fastify.get<{ Querystring: { q: string } }>(
    '/search',
    {
      schema: {
        querystring: searchQuerySchema,
      },
    },
    async (request, reply) => {
      try {
        const results = await searchMessages(request.query.q);
        return reply.send(results);
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno do servidor' });
      }
    },
  );
}
