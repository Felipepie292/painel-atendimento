import type { WebSocket } from 'ws';
import type { Message } from '../types/index.js';

const clients = new Set<WebSocket>();

/**
 * Registers a new WebSocket client for broadcasting.
 * Automatically removes the client when the socket closes.
 */
export function addClient(socket: WebSocket): void {
  clients.add(socket);
  socket.on('close', () => {
    clients.delete(socket);
  });
}

/**
 * Broadcasts a message event to every connected WebSocket client.
 * Catches individual send errors to avoid breaking the broadcast loop.
 */
export function broadcast(msg: Message): void {
  const payload = JSON.stringify({ type: 'new_message', data: msg });
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      try {
        client.send(payload);
      } catch {
        // Client likely closing — will be cleaned up on 'close' event
      }
    }
  }
}

/**
 * Returns the number of currently connected WebSocket clients.
 */
export function getClientCount(): number {
  return clients.size;
}
