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
  tags: string[];
  satisfaction_score: number;
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
  tags: string[];
  satisfaction_score: number;
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

/** Hourly distribution data point. */
export interface HourlyData {
  hour: number;
  count: number;
}

/** Daily distribution data point. Day is abbreviated in Portuguese (seg, ter, etc.). */
export interface DailyData {
  day: string;
  count: number;
}

/** Tag occurrence count. */
export interface TagCount {
  tag: string;
  count: number;
}

/** Daily trend data point for the last 30 days. */
export interface DailyTrend {
  date: string;
  count: number;
}

/** Full analytics response. */
export interface Analytics {
  hourly_distribution: HourlyData[];
  daily_distribution: DailyData[];
  tag_ranking: TagCount[];
  avg_first_response_seconds: number;
  finished_rate: number;
  abandoned_rate: number;
  daily_trend: DailyTrend[];
}
