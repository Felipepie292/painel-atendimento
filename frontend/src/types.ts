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
  status: 'active' | 'finished';
  first_message_at: string;
}

/** Lightweight summary used in the conversation list endpoint. */
export interface ConversationSummary {
  id: string;
  name: string;
  last_message: string;
  message_count: number;
  last_message_at: string;
  status: 'active' | 'finished';
  unread_count: number;
}

/** A single search result returned by the search endpoint. */
export interface SearchResult {
  conversation_id: string;
  name: string;
  message: string;
  timestamp: string;
}

/** Aggregated metrics for the dashboard. */
export interface Metrics {
  total_today: number;
  active_now: number;
  avg_response_time_seconds: number;
  total_messages_today: number;
}

/** Optional filters for listing conversations. */
export interface ConversationFilters {
  status?: string;
  search?: string;
  period?: 'today' | '7days' | '30days';
}

/** WebSocket event types sent by the server. */
export type WSEventType = 'new_message' | 'connected';

/** WebSocket event for a new message. */
export interface WSNewMessageEvent {
  type: 'new_message';
  data: Message & {
    conversation_id: string;
    unread_count?: number;
  };
}

/** WebSocket event confirming connection. */
export interface WSConnectedEvent {
  type: 'connected';
  data?: { message: string };
}

/** Union of all possible WebSocket events. */
export type WSEvent = WSNewMessageEvent | WSConnectedEvent;
