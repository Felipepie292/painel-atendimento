import type { FastifyInstance } from 'fastify';
import { addClient } from '../services/websocket.js';

const HEARTBEAT_INTERVAL = 30_000;

/**
 * Registers the WebSocket route with heartbeat ping/pong.
 * Handles connection errors and cleans up resources on close.
 */
export async function websocketRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/ws', { websocket: true }, (socket, _request) => {
    addClient(socket);

    // Heartbeat: ping every 30 seconds
    let alive = true;

    const heartbeat = setInterval(() => {
      if (!alive) {
        socket.terminate();
        clearInterval(heartbeat);
        return;
      }
      alive = false;
      socket.ping();
    }, HEARTBEAT_INTERVAL);

    socket.on('pong', () => {
      alive = true;
    });

    socket.on('close', () => {
      clearInterval(heartbeat);
    });

    socket.on('error', (err) => {
      fastify.log.error(err, 'WebSocket error');
      clearInterval(heartbeat);
      socket.terminate();
    });

    socket.send(JSON.stringify({ type: 'connected' }));
  });
}
