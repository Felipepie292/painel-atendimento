import type { WebSocket } from 'ws';
import type { Message } from '../types/index.js';

/** Map of clientId → WebSocket for accurate connection tracking. */
const clients = new Map<string, WebSocket>();

/**
 * Registers a new WebSocket client for broadcasting.
 * Returns the assigned clientId so the caller can remove it on close.
 */
export function addClient(socket: WebSocket, clientId: string): void {
  clients.set(clientId, socket);
}

/**
 * Removes a client from the broadcast pool.
 */
export function removeClient(clientId: string): void {
  clients.delete(clientId);
}

/**
 * Broadcasts a message event to every connected WebSocket client.
 * Includes the conversation_id and the updated unread_count for that conversation.
 * Catches individual send errors to avoid breaking the broadcast loop.
 */
export function broadcast(msg: Message, conversationId: string, unreadCount: number): void {
  const payload = JSON.stringify({
    type: 'new_message',
    data: msg,
    conversation_id: conversationId,
    unread_count: unreadCount,
  });
  for (const [id, client] of clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload, (err) => {
        if (err) {
          clients.delete(id);
        }
      });
    }
  }
}

/**
 * Returns the number of currently connected WebSocket clients.
 */
export function getClientCount(): number {
  return clients.size;
}
