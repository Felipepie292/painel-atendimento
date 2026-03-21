import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { addClient, removeClient } from '../services/websocket.js';

const HEARTBEAT_INTERVAL = 30_000;

/**
 * Registers the WebSocket route with heartbeat ping/pong.
 * Each connection is assigned a UUID for accurate tracking.
 * Handles connection errors and cleans up resources on close.
 */
export async function websocketRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/ws', { websocket: true }, (socket, _request) => {
    const clientId = randomUUID();
    addClient(socket, clientId);

    // Heartbeat: ping every 30 seconds, terminate if no pong received
    let alive = true;

    const heartbeat = setInterval(() => {
      if (!alive) {
        removeClient(clientId);
        clearInterval(heartbeat);
        socket.terminate();
        return;
      }
      alive = false;
      socket.ping();
    }, HEARTBEAT_INTERVAL);

    socket.on('pong', () => {
      alive = true;
    });

    socket.on('close', () => {
      removeClient(clientId);
      clearInterval(heartbeat);
    });

    socket.on('error', (err) => {
      fastify.log.error(err, 'WebSocket error');
      removeClient(clientId);
      clearInterval(heartbeat);
      socket.terminate();
    });

    socket.send(JSON.stringify({ type: 'connected', clientId }));
  });
}
