import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  Message,
  Conversation,
  ConversationSummary,
  ConversationFilters,
  SearchResult,
  Metrics,
} from '../types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'messages.json');

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
async function readAllConversations(): Promise<Conversation[]> {
  await ensureDataDir();
  try {
    const raw = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as Conversation[];
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
async function writeConversations(conversations: Conversation[]): Promise<void> {
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
 */
export async function getConversationById(id: string): Promise<Conversation | null> {
  const conversations = await readAllConversations();
  return conversations.find((c) => c.conversation_id === id) ?? null;
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
 * - total_today: conversations that have messages in the period
 * - active_now: conversations with status 'active'
 * - avg_response_time_seconds: average seconds between a client message and the next agent reply
 * - total_messages_today: count of all messages in the period
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
