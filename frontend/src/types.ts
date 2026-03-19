/** A single chat message received from the n8n webhook. */
export interface Message {
  conversation_id: string;
  name: string;
  role: 'client' | 'agent';
  message: string;
  timestamp: string;
}

/** A full conversation containing all its messages. */
export interface Conversation {
  conversation_id: string;
  name: string;
  messages: Message[];
  last_message_at: string;
}

/** Lightweight summary used in the conversation list endpoint. */
export interface ConversationSummary {
  id: string;
  name: string;
  last_message: string;
  message_count: number;
  last_message_at: string;
}

/** WebSocket event types sent by the server. */
export type WSEventType = 'new_message' | 'connected';

/** WebSocket event for a new message. */
export interface WSNewMessageEvent {
  type: 'new_message';
  data: Message;
}

/** WebSocket event confirming connection. */
export interface WSConnectedEvent {
  type: 'connected';
  data?: { message: string };
}

/** Union of all possible WebSocket events. */
export type WSEvent = WSNewMessageEvent | WSConnectedEvent;
