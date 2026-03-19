import type { FastifyInstance } from 'fastify';
import { addMessage } from '../services/storage.js';
import { broadcast } from '../services/websocket.js';
import type { Message } from '../types/index.js';

const messageSchema = {
  type: 'object',
  required: ['conversation_id', 'name', 'role', 'message', 'timestamp'],
  properties: {
    conversation_id: { type: 'string', minLength: 1, maxLength: 50 },
    name: { type: 'string', minLength: 1, maxLength: 200 },
    role: { type: 'string', enum: ['client', 'agent'] },
    message: { type: 'string', minLength: 1, maxLength: 10000 },
    timestamp: { type: 'string', format: 'date-time' },
  },
  additionalProperties: false,
} as const;

/**
 * Registers the POST /api/messages route.
 * Validates the incoming payload, persists the message, broadcasts it
 * to all WebSocket clients, and returns 201 with the saved message.
 */
export async function messageRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: Message }>(
    '/messages',
    {
      schema: {
        body: messageSchema,
      },
    },
    async (request, reply) => {
      try {
        const saved = await addMessage(request.body);
        broadcast(saved);
        return reply.status(201).send(saved);
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro interno do servidor' });
      }
    },
  );
}
