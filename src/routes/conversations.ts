import type { FastifyInstance } from 'fastify';
import { getConversations, getConversationById } from '../services/storage.js';

const paramsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1, maxLength: 50 },
  },
} as const;

/**
 * Registers conversation-related routes.
 *
 * - GET /api/conversations       — list all conversations with summary info
 * - GET /api/conversations/:id   — get a single conversation with all messages
 */
export async function conversationRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/conversations
   * Returns a list of conversation summaries sorted by most recent message.
   */
  fastify.get('/conversations', async (_request, reply) => {
    try {
      const summaries = await getConversations();
      return reply.send(summaries);
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  /**
   * GET /api/conversations/:id
   * Returns the full conversation including all messages.
   * Responds with 404 when the conversation does not exist.
   */
  fastify.get<{ Params: { id: string } }>(
    '/conversations/:id',
    {
      schema: {
        params: paramsSchema,
      },
    },
    async (request, reply) => {
      try {
        const conversation = await getConversationById(request.params.id);
        if (!conversation) {
          return reply.status(404).send({ error: 'Conversa não encontrada' });
        }
        return reply.send(conversation);
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno do servidor' });
      }
    },
  );
}
