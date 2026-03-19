import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import { messageRoutes } from './routes/messages.js';
import { conversationRoutes } from './routes/conversations.js';
import { websocketRoutes } from './routes/websocket.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fastify = Fastify({ logger: true });

/** Allowed CORS origins. Configurable via CORS_ORIGIN env var. */
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

/**
 * Bootstraps and starts the Fastify server.
 * Registers CORS, WebSocket, auth hook, static file serving (production),
 * and all API / WebSocket route plugins.
 */
async function start(): Promise<void> {
  await fastify.register(cors, {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  });
  await fastify.register(websocket);

  // API key authentication for webhook endpoints (POST /api/*)
  const apiKey = process.env.API_KEY || '';
  if (apiKey) {
    fastify.addHook('onRequest', async (request, reply) => {
      // Skip auth for GET requests (dashboard), WebSocket upgrades, and static files
      if (request.method === 'GET') return;

      const provided = request.headers['x-api-key'] || request.headers.authorization?.replace('Bearer ', '');
      if (provided !== apiKey) {
        return reply.status(401).send({ error: 'Não autorizado' });
      }
    });
  }

  // Serve the frontend build in production
  if (process.env.NODE_ENV === 'production') {
    const frontendDist = path.resolve(__dirname, '../frontend/dist');
    await fastify.register(fastifyStatic, {
      root: frontendDist,
      wildcard: false,
    });

    // SPA fallback: serve index.html for any non-API, non-WS route
    fastify.setNotFoundHandler((_request, reply) => {
      return reply.sendFile('index.html');
    });
  }

  // Health check endpoint for Docker / load balancers
  fastify.get('/health', async (_request, reply) => {
    return reply.send({ status: 'ok', uptime: process.uptime() });
  });

  await fastify.register(messageRoutes, { prefix: '/api' });
  await fastify.register(conversationRoutes, { prefix: '/api' });
  await fastify.register(websocketRoutes);

  const port = Number(process.env.PORT) || 3001;
  await fastify.listen({ port, host: '0.0.0.0' });
}

/** Graceful shutdown on SIGTERM/SIGINT. */
function setupGracefulShutdown(): void {
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
  for (const signal of signals) {
    process.on(signal, async () => {
      fastify.log.info(`Received ${signal}, shutting down gracefully...`);
      await fastify.close();
      process.exit(0);
    });
  }
}

setupGracefulShutdown();

start().catch((err) => {
  fastify.log.error(err);
  process.exit(1);
});
