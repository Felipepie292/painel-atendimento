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
