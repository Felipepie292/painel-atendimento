import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectTags } from './tags.js';
import { calculateSatisfactionScore } from './satisfaction.js';
import type {
  Message,
  Conversation,
  ConversationSummary,
  ConversationFilters,
  SearchResult,
  Metrics,
  Analytics,
  HourlyData,
  DailyData,
  TagCount,
  DailyTrend,
} from '../types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'messages.json');

/** Raw conversation shape as stored on disk (without computed fields). */
interface StoredConversation {
  conversation_id: string;
  name: string;
  messages: Message[];
  last_message_at: string;
  status: 'active' | 'finished';
  first_message_at: string;
  notes?: string;
}

/** Simple promise-based mutex to serialize read-modify-write cycles. */
let writeLock: Promise<void> = Promise.resolve();

/**
 * Wraps an async operation so that it runs exclusively —
 * no two write operations can interleave.
 */
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = writeLock.then(fn);
  // Update the lock chain; swallow errors so the chain doesn't break
  writeLock = result.then(() => undefined, () => undefined);
  return result;
}

/**
 * Ensures the data directory exists, creating it if necessary.
 */
async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

/**
 * Reads all conversations from the JSON file.
 * Returns an empty array if the file does not exist yet.
 */
async function readAllConversations(): Promise<StoredConversation[]> {
  await ensureDataDir();
  try {
    const raw = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as StoredConversation[];
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

/**
 * Persists conversations to disk using an atomic write strategy:
 * write to a temporary file first, then rename over the target.
 */
async function writeConversations(conversations: StoredConversation[]): Promise<void> {
  await ensureDataDir();
  const tempFile = `${DATA_FILE}.tmp`;
  await writeFile(tempFile, JSON.stringify(conversations, null, 2), 'utf-8');
  await rename(tempFile, DATA_FILE);
}

/**
 * Returns the start-of-day Date for a given period filter.
 */
function getPeriodStart(period: 'today' | '7days' | '30days'): Date {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === '7days') {
    start.setDate(start.getDate() - 7);
  } else if (period === '30days') {
    start.setDate(start.getDate() - 30);
  }
  return start;
}

/**
 * Enriches a stored conversation with computed tags and satisfaction score.
 */
function enrichConversation(conv: StoredConversation): Conversation {
  return {
    ...conv,
    tags: detectTags(conv.messages),
    satisfaction_score: calculateSatisfactionScore(conv.messages),
    notes: conv.notes,
  };
}

/**
 * Saves or updates the operator notes for a conversation.
 * Uses a mutex to prevent concurrent write race conditions.
 * Returns true if the conversation was found and updated, false otherwise.
 */
export function saveNote(id: string, notes: string): Promise<boolean> {
  return withLock(async () => {
    const conversations = await readAllConversations();
    const conversation = conversations.find((c) => c.conversation_id === id);
    if (!conversation) return false;
    conversation.notes = notes;
    await writeConversations(conversations);
    return true;
  });
}

/**
 * Calculates the unread count for a conversation.
 * Unread messages are client messages that arrived after the last agent message.
 */
function calcUnreadCount(messages: Message[]): number {
  let lastAgentIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'agent') {
      lastAgentIdx = i;
      break;
    }
  }
  if (lastAgentIdx === -1) {
    // No agent message at all — all messages are "unread"
    return messages.filter((m) => m.role === 'client').length;
  }
  let count = 0;
  for (let i = lastAgentIdx + 1; i < messages.length; i++) {
    if (messages[i].role === 'client') {
      count++;
    }
  }
  return count;
}

/**
 * Saves a new message into the appropriate conversation.
 * Uses a mutex to prevent concurrent read-modify-write race conditions.
 * Creates the conversation if it does not exist yet.
 * Returns the saved message and the updated unread count for the conversation.
 */
export function addMessage(msg: Message): Promise<{ message: Message; unread_count: number; conversation_id: string }> {
  return withLock(async () => {
    const conversations = await readAllConversations();

    let conversation = conversations.find(
      (c) => c.conversation_id === msg.conversation_id,
    );

    if (!conversation) {
      conversation = {
        conversation_id: msg.conversation_id,
        name: msg.name,
        messages: [],
        last_message_at: msg.timestamp,
        status: 'active',
        first_message_at: msg.timestamp,
      };
      conversations.push(conversation);
    }

    conversation.messages.push(msg);
    conversation.last_message_at = msg.timestamp;

    await writeConversations(conversations);

    const unread_count = calcUnreadCount(conversation.messages);

    return { message: msg, unread_count, conversation_id: msg.conversation_id };
  });
}

/**
 * Returns a summary list of all conversations, optionally filtered.
 * Sorted by most recent message first.
 * Includes auto-detected tags and satisfaction score for each conversation.
 */
export async function getConversations(filters?: ConversationFilters): Promise<ConversationSummary[]> {
  let conversations = await readAllConversations();

  // Apply status filter
  if (filters?.status) {
    conversations = conversations.filter((c) => c.status === filters.status);
  }

  // Apply period filter
  if (filters?.period) {
    const periodStart = getPeriodStart(filters.period);
    conversations = conversations.filter((c) => {
      return c.messages.some((m) => new Date(m.timestamp) >= periodStart);
    });
  }

  // Apply search filter (searches in conversation name and messages)
  if (filters?.search) {
    const query = filters.search.toLowerCase();
    conversations = conversations.filter((c) => {
      if (c.name.toLowerCase().includes(query)) return true;
      return c.messages.some((m) => m.message.toLowerCase().includes(query));
    });
  }

  const summaries: ConversationSummary[] = conversations.map((c) => {
    const lastMsg = c.messages[c.messages.length - 1];
    return {
      id: c.conversation_id,
      name: c.name,
      last_message: lastMsg ? lastMsg.message : '',
      message_count: c.messages.length,
      last_message_at: c.last_message_at,
      status: c.status ?? 'active',
      unread_count: calcUnreadCount(c.messages),
      tags: detectTags(c.messages),
      satisfaction_score: calculateSatisfactionScore(c.messages),
    };
  });

  summaries.sort(
    (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
  );

  return summaries;
}

/**
 * Returns the full conversation (with all messages) for a given id.
 * Returns null when the conversation does not exist.
 * Includes auto-detected tags and satisfaction score.
 */
export async function getConversationById(id: string): Promise<Conversation | null> {
  const conversations = await readAllConversations();
  const conv = conversations.find((c) => c.conversation_id === id);
  if (!conv) return null;
  return enrichConversation(conv);
}

/**
 * Marks a conversation as finished.
 * Uses a mutex to prevent concurrent write race conditions.
 * Returns true if the conversation was found and updated, false otherwise.
 */
export function finishConversation(id: string): Promise<boolean> {
  return withLock(async () => {
    const conversations = await readAllConversations();
    const conversation = conversations.find((c) => c.conversation_id === id);
    if (!conversation) {
      return false;
    }
    conversation.status = 'finished';
    await writeConversations(conversations);
    return true;
  });
}

/**
 * Searches across all conversations for messages matching the query string.
 * Returns an array of SearchResult objects with conversation context.
 */
export async function searchMessages(query: string): Promise<SearchResult[]> {
  const conversations = await readAllConversations();
  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  for (const conv of conversations) {
    for (const msg of conv.messages) {
      if (msg.message.toLowerCase().includes(lowerQuery)) {
        results.push({
          conversation_id: conv.conversation_id,
          name: conv.name,
          message: msg.message,
          timestamp: msg.timestamp,
        });
      }
    }
  }

  return results;
}

/**
 * Calculates dashboard metrics.
 * Optionally filters by period ('today', '7days', '30days').
 */
export async function getMetrics(period?: 'today' | '7days' | '30days'): Promise<Metrics> {
  const conversations = await readAllConversations();
  const periodStart = getPeriodStart(period ?? 'today');

  let totalConversations = 0;
  let activeNow = 0;
  let totalMessages = 0;
  let totalResponseTime = 0;
  let responseCount = 0;

  for (const conv of conversations) {
    const messagesInPeriod = conv.messages.filter(
      (m) => new Date(m.timestamp) >= periodStart,
    );

    if (messagesInPeriod.length > 0) {
      totalConversations++;
      totalMessages += messagesInPeriod.length;
    }

    if (conv.status === 'active' && messagesInPeriod.length > 0) {
      activeNow++;
    }

    // Calculate response times within the period only
    for (let i = 0; i < conv.messages.length - 1; i++) {
      const current = conv.messages[i];
      const next = conv.messages[i + 1];
      if (current.role === 'client' && next.role === 'agent') {
        const clientTime = new Date(current.timestamp).getTime();
        const agentTime = new Date(next.timestamp).getTime();
        if (!isNaN(clientTime) && !isNaN(agentTime) && agentTime > clientTime && clientTime >= periodStart.getTime()) {
          totalResponseTime += (agentTime - clientTime) / 1000;
          responseCount++;
        }
      }
    }
  }

  return {
    total_today: totalConversations,
    active_now: activeNow,
    avg_response_time_seconds: responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 0,
    total_messages_today: totalMessages,
  };
}

/** Portuguese abbreviated day names indexed by JS getDay() (0=Sunday). */
const DAY_NAMES = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

/**
 * Computes full analytics data for a given period.
 * @param period - The time period to analyze. Defaults to '30days'.
 * @returns An Analytics object with distributions, rankings, and rates.
 */
export async function getAnalytics(period?: 'today' | '7days' | '30days'): Promise<Analytics> {
  const conversations = await readAllConversations();
  const periodStart = getPeriodStart(period ?? '30days');
  const now = new Date();

  // Filter conversations that have messages in the period
  const relevantConvs = conversations.filter((c) =>
    c.messages.some((m) => new Date(m.timestamp) >= periodStart),
  );

  // --- Hourly distribution ---
  const hourlyMap = new Map<number, number>();
  for (let h = 0; h < 24; h++) hourlyMap.set(h, 0);

  for (const conv of relevantConvs) {
    for (const msg of conv.messages) {
      const d = new Date(msg.timestamp);
      if (d >= periodStart) {
        hourlyMap.set(d.getHours(), (hourlyMap.get(d.getHours()) ?? 0) + 1);
      }
    }
  }

  const hourly_distribution: HourlyData[] = [];
  for (let h = 0; h < 24; h++) {
    hourly_distribution.push({ hour: h, count: hourlyMap.get(h) ?? 0 });
  }

  // --- Daily distribution (by day of week) ---
  const dailyMap = new Map<number, number>();
  for (let d = 0; d < 7; d++) dailyMap.set(d, 0);

  for (const conv of relevantConvs) {
    for (const msg of conv.messages) {
      const d = new Date(msg.timestamp);
      if (d >= periodStart) {
        dailyMap.set(d.getDay(), (dailyMap.get(d.getDay()) ?? 0) + 1);
      }
    }
  }

  // Order: seg, ter, qua, qui, sex, sab, dom
  const dayOrder = [1, 2, 3, 4, 5, 6, 0];
  const daily_distribution: DailyData[] = dayOrder.map((d) => ({
    day: DAY_NAMES[d],
    count: dailyMap.get(d) ?? 0,
  }));

  // --- Tag ranking ---
  const tagCountMap = new Map<string, number>();
  for (const conv of relevantConvs) {
    const tags = detectTags(conv.messages);
    for (const tag of tags) {
      tagCountMap.set(tag, (tagCountMap.get(tag) ?? 0) + 1);
    }
  }

  const tag_ranking: TagCount[] = Array.from(tagCountMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  // --- Average first response time ---
  let totalFirstResponse = 0;
  let firstResponseCount = 0;

  for (const conv of relevantConvs) {
    const firstClient = conv.messages.find((m) => m.role === 'client');
    if (!firstClient) continue;
    const firstAgent = conv.messages.find(
      (m) => m.role === 'agent' && new Date(m.timestamp) > new Date(firstClient.timestamp),
    );
    if (!firstAgent) continue;
    const diff = (new Date(firstAgent.timestamp).getTime() - new Date(firstClient.timestamp).getTime()) / 1000;
    if (diff > 0) {
      totalFirstResponse += diff;
      firstResponseCount++;
    }
  }

  const avg_first_response_seconds = firstResponseCount > 0
    ? Math.round(totalFirstResponse / firstResponseCount)
    : 0;

  // --- Finished rate ---
  const finishedCount = relevantConvs.filter((c) => c.status === 'finished').length;
  const finished_rate = relevantConvs.length > 0
    ? Math.round((finishedCount / relevantConvs.length) * 100) / 100
    : 0;

  // --- Abandoned rate (active conversations with no agent reply in 24h+) ---
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const activeConvs = relevantConvs.filter((c) => c.status === 'active');
  let abandonedCount = 0;

  for (const conv of activeConvs) {
    const lastAgentMsg = [...conv.messages].reverse().find((m) => m.role === 'agent');
    const lastClientMsg = [...conv.messages].reverse().find((m) => m.role === 'client');

    if (!lastAgentMsg && lastClientMsg) {
      // No agent reply at all — abandoned if last client message is older than 24h
      if (new Date(lastClientMsg.timestamp) < twentyFourHoursAgo) {
        abandonedCount++;
      }
    } else if (lastAgentMsg && lastClientMsg) {
      // If last client message is after last agent message and older than 24h
      if (
        new Date(lastClientMsg.timestamp) > new Date(lastAgentMsg.timestamp) &&
        new Date(lastClientMsg.timestamp) < twentyFourHoursAgo
      ) {
        abandonedCount++;
      }
    }
  }

  const abandoned_rate = relevantConvs.length > 0
    ? Math.round((abandonedCount / relevantConvs.length) * 100) / 100
    : 0;

  // --- Daily trend (last 30 days) ---
  const trendStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  trendStart.setDate(trendStart.getDate() - 29);

  const trendMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(trendStart);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    trendMap.set(key, 0);
  }

  for (const conv of conversations) {
    // Count conversations by the date of their first message
    const firstMsgDate = new Date(conv.first_message_at);
    const key = firstMsgDate.toISOString().slice(0, 10);
    if (trendMap.has(key)) {
      trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
    }
  }

  const daily_trend: DailyTrend[] = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return {
    hourly_distribution,
    daily_distribution,
    tag_ranking,
    avg_first_response_seconds,
    finished_rate,
    abandoned_rate,
    daily_trend,
  };
}

/**
 * Exports conversation data as a CSV string with BOM UTF-8.
 * Exports per-message rows for maximum detail.
 * BOM (\uFEFF) ensures Excel opens the file with correct encoding.
 * @param period - Optional period filter.
 * @returns A CSV string (with BOM) ready for download.
 */
export async function exportConversationsCSV(period?: 'today' | '7days' | '30days'): Promise<string> {
  let conversations = await readAllConversations();

  if (period) {
    const periodStart = getPeriodStart(period);
    conversations = conversations.filter((c) =>
      c.messages.some((m) => new Date(m.timestamp) >= periodStart),
    );
  }

  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;

  const header = 'conversation_id,client_name,status,role,message,timestamp,tags,satisfaction_score,first_message_at,last_message_at';

  const rows: string[] = [];
  for (const c of conversations) {
    const tags = detectTags(c.messages).join('; ');
    const score = calculateSatisfactionScore(c.messages);
    for (const msg of c.messages) {
      rows.push(
        [
          esc(c.conversation_id),
          esc(c.name),
          c.status,
          msg.role,
          esc(msg.message),
          msg.timestamp,
          esc(tags),
          score,
          c.first_message_at,
          c.last_message_at,
        ].join(','),
      );
    }
  }

  // BOM UTF-8 (\uFEFF) for Excel compatibility
  return '\uFEFF' + [header, ...rows].join('\r\n');
}
