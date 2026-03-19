import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Message, Conversation, ConversationSummary } from '../types/index.js';

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
 * Saves a new message into the appropriate conversation.
 * Uses a mutex to prevent concurrent read-modify-write race conditions.
 * Creates the conversation if it does not exist yet.
 * Returns the saved message.
 */
export function addMessage(msg: Message): Promise<Message> {
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
      };
      conversations.push(conversation);
    }

    conversation.messages.push(msg);
    conversation.last_message_at = msg.timestamp;

    await writeConversations(conversations);

    return msg;
  });
}

/**
 * Returns a summary list of all conversations, including the last message
 * preview and total message count. Sorted by most recent message first.
 */
export async function getConversations(): Promise<ConversationSummary[]> {
  const conversations = await readAllConversations();

  const summaries: ConversationSummary[] = conversations.map((c) => {
    const lastMsg = c.messages[c.messages.length - 1];
    return {
      id: c.conversation_id,
      name: c.name,
      last_message: lastMsg ? lastMsg.message : '',
      message_count: c.messages.length,
      last_message_at: c.last_message_at,
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
