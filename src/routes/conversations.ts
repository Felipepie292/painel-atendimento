import type { FastifyInstance } from 'fastify';
import {
  getConversations,
  getConversationById,
  finishConversation,
  saveNote,
} from '../services/storage.js';
import type { ConversationFilters } from '../types/index.js';

const paramsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1, maxLength: 50 },
  },
} as const;

const conversationQuerySchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['active', 'finished'] },
    search: { type: 'string', minLength: 1, maxLength: 200 },
    period: { type: 'string', enum: ['today', '7days', '30days'] },
  },
  additionalProperties: false,
} as const;

/**
 * Registers conversation-related routes.
 *
 * - GET   /api/conversations              — list all conversations with summary info
 * - GET   /api/conversations/:id          — get a single conversation with all messages
 * - PATCH /api/conversations/:id/finish   — mark conversation as finished
 * - GET   /api/conversations/:id/export   — export conversation as plain text
 */
export async function conversationRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/conversations
   * Returns a list of conversation summaries sorted by most recent message.
   * Accepts optional query filters: status, search, period.
   */
  fastify.get<{ Querystring: ConversationFilters }>(
    '/conversations',
    {
      schema: {
        querystring: conversationQuerySchema,
      },
    },
    async (request, reply) => {
      try {
        const filters: ConversationFilters = {
          status: request.query.status,
          search: request.query.search,
          period: request.query.period,
        };
        const summaries = await getConversations(filters);
        return reply.send(summaries);
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno do servidor' });
      }
    },
  );

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

  /**
   * PATCH /api/conversations/:id/finish
   * Marks a conversation as finished.
   * Returns the updated conversation or 404 if not found.
   */
  fastify.patch<{ Params: { id: string } }>(
    '/conversations/:id/finish',
    {
      schema: {
        params: paramsSchema,
      },
    },
    async (request, reply) => {
      try {
        const updated = await finishConversation(request.params.id);
        if (!updated) {
          return reply.status(404).send({ error: 'Conversa não encontrada' });
        }
        const conversation = await getConversationById(request.params.id);
        return reply.send(conversation);
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno do servidor' });
      }
    },
  );

  /**
   * GET /api/conversations/:id/note
   * Returns the operator notes for a conversation.
   */
  fastify.get<{ Params: { id: string } }>(
    '/conversations/:id/note',
    { schema: { params: paramsSchema } },
    async (request, reply) => {
      try {
        const conversation = await getConversationById(request.params.id);
        if (!conversation) {
          return reply.status(404).send({ error: 'Conversa não encontrada' });
        }
        return reply.send({ notes: conversation.notes ?? '' });
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno do servidor' });
      }
    },
  );

  /**
   * PUT /api/conversations/:id/note
   * Saves or updates the operator notes for a conversation.
   */
  fastify.put<{ Params: { id: string }; Body: { notes: string } }>(
    '/conversations/:id/note',
    {
      schema: {
        params: paramsSchema,
        body: {
          type: 'object',
          required: ['notes'],
          properties: {
            notes: { type: 'string', maxLength: 5000 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      try {
        const found = await saveNote(request.params.id, request.body.notes);
        if (!found) {
          return reply.status(404).send({ error: 'Conversa não encontrada' });
        }
        return reply.send({ ok: true });
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno do servidor' });
      }
    },
  );

  /**
   * GET /api/conversations/:id/export
   * Returns the conversation as a plain text download file.
   */
  fastify.get<{ Params: { id: string } }>(
    '/conversations/:id/export',
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

        const lines: string[] = [
          `Conversa: ${conversation.name}`,
          `ID: ${conversation.conversation_id}`,
          `Status: ${conversation.status}`,
          `Início: ${conversation.first_message_at}`,
          `Última mensagem: ${conversation.last_message_at}`,
          '',
          '--- Mensagens ---',
          '',
        ];

        for (const msg of conversation.messages) {
          const roleLabel = msg.role === 'client' ? msg.name : 'Agente';
          lines.push(`[${msg.timestamp}] ${roleLabel}: ${msg.message}`);
        }

        const text = lines.join('\n');
        const safeId = conversation.conversation_id.replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `conversa-${safeId}.txt`;

        return reply
          .header('Content-Type', 'text/plain; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="${filename}"`)
          .send(text);
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno do servidor' });
      }
    },
  );
}
