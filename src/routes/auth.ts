import type { FastifyInstance } from 'fastify';
import {
  isPanelAuthEnabled,
  validatePassword,
  generateToken,
  validateToken,
  revokeToken,
} from '../services/auth.js';

const loginBodySchema = {
  type: 'object',
  required: ['password'],
  properties: {
    password: { type: 'string', minLength: 1, maxLength: 200 },
  },
  additionalProperties: false,
} as const;

/**
 * Registers authentication routes.
 *
 * - POST /api/auth/login   — authenticate with panel password
 * - GET  /api/auth/verify  — verify session token
 * - POST /api/auth/logout  — revoke session token
 */
export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/auth/login
   * Validates the panel password and returns a session token.
   */
  fastify.post<{ Body: { password: string } }>(
    '/auth/login',
    {
      schema: { body: loginBodySchema },
    },
    async (request, reply) => {
      if (!isPanelAuthEnabled()) {
        return reply.send({ token: '', auth_required: false });
      }

      if (!validatePassword(request.body.password)) {
        return reply.status(401).send({ error: 'Senha incorreta' });
      }

      const token = generateToken();
      return reply.send({ token, auth_required: true });
    },
  );

  /**
   * GET /api/auth/verify
   * Verifies the provided session token is still valid.
   */
  fastify.get('/auth/verify', async (request, reply) => {
    if (!isPanelAuthEnabled()) {
      return reply.send({ valid: true, auth_required: false });
    }

    const token = (request.headers.authorization ?? '').replace('Bearer ', '');
    if (!token || !validateToken(token)) {
      return reply.status(401).send({ valid: false });
    }

    return reply.send({ valid: true, auth_required: true });
  });

  /**
   * POST /api/auth/logout
   * Revokes the provided session token.
   */
  fastify.post('/auth/logout', async (request, reply) => {
    const token = (request.headers.authorization ?? '').replace('Bearer ', '');
    if (token) {
      revokeToken(token);
    }
    return reply.send({ ok: true });
  });
}
