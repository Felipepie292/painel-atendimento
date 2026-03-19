import { useState, useEffect, useCallback, useRef } from 'react';
import type { Conversation, ConversationSummary, Message } from './types';
import { useWebSocket } from './hooks/useWebSocket';
import { ConversationList } from './components/ConversationList';
import { ChatWindow } from './components/ChatWindow';

/**
 * Creates a unique key for a message to prevent duplicate processing.
 */
function messageKey(msg: Message): string {
  return `${msg.conversation_id}:${msg.timestamp}:${msg.message}`;
}

/**
 * Root application component. Manages conversation state, fetches data from the
 * API, and integrates real-time WebSocket updates.
 */
function App() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { connected, lastMessage } = useWebSocket();

  // Track last processed message to avoid duplicates on re-renders
  const lastProcessedRef = useRef<string | null>(null);
  // Track selected ID in a ref for the WebSocket effect
  const selectedIdRef = useRef<string | null>(null);
  // AbortController for conversation fetch race condition
  const fetchAbortRef = useRef<AbortController | null>(null);

  // Keep the ref in sync
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  /** Fetch the conversation list from the API. */
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      if (!res.ok) {
        setError('Falha ao carregar conversas');
        return;
      }
      const data = (await res.json()) as ConversationSummary[];
      setConversations(data);
      setError(null);
    } catch {
      setError('Servidor indisponível');
    }
  }, []);

  /** Fetch a single conversation's full messages. */
  const fetchConversation = useCallback(async (id: string) => {
    // Abort any in-flight request to prevent race conditions
    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort();
    }
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    try {
      const res = await fetch(`/api/conversations/${id}`, {
        signal: controller.signal,
      });
      if (!res.ok) return;
      const data = (await res.json()) as Conversation;
      // Only update if this request wasn't aborted
      if (!controller.signal.aborted) {
        setActiveConversation(data);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // Silently fail — user can retry by re-selecting
    }
  }, []);

  // Load conversation list on mount
  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  // Handle WebSocket new_message events
  useEffect(() => {
    if (!lastMessage) return;

    // Deduplicate: skip if already processed
    const key = messageKey(lastMessage);
    if (lastProcessedRef.current === key) return;
    lastProcessedRef.current = key;

    // Update conversation list: move the affected conversation to the top
    setConversations((prev) => {
      const existingIdx = prev.findIndex(
        (c) => c.id === lastMessage.conversation_id
      );

      if (existingIdx >= 0) {
        const updated = { ...prev[existingIdx] };
        updated.last_message = lastMessage.message;
        updated.last_message_at = lastMessage.timestamp;
        updated.message_count += 1;
        return [updated, ...prev.filter((_, i) => i !== existingIdx)];
      }

      // New conversation — add it to the top
      const newSummary: ConversationSummary = {
        id: lastMessage.conversation_id,
        name: lastMessage.name,
        last_message: lastMessage.message,
        message_count: 1,
        last_message_at: lastMessage.timestamp,
      };
      return [newSummary, ...prev];
    });

    // If the message belongs to the currently selected conversation, append it
    if (lastMessage.conversation_id === selectedIdRef.current) {
      setActiveConversation((prev) => {
        if (!prev) return prev;
        // Deduplicate within the conversation
        const exists = prev.messages.some(
          (m) => m.timestamp === lastMessage.timestamp && m.message === lastMessage.message
        );
        if (exists) return prev;
        return {
          ...prev,
          messages: [...prev.messages, lastMessage],
          last_message_at: lastMessage.timestamp,
        };
      });
    }
  }, [lastMessage]);

  /** Handle conversation selection from the sidebar. */
  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      void fetchConversation(id);
    },
    [fetchConversation]
  );

  return (
    <div className="flex h-screen bg-zinc-900 text-zinc-100">
      {/* Sidebar */}
      <aside className="hidden sm:flex w-[300px] min-w-[300px] flex-col border-r border-zinc-700/50 bg-zinc-950">
        <div className="px-4 pt-5 pb-4 shrink-0">
          <h1 className="text-lg font-bold text-indigo-400">
            Painel de Atendimentos
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Monitoramento em tempo real
          </p>
        </div>
        <div className="border-t border-zinc-700/50" />
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      </aside>

      {/* Mobile sidebar */}
      <aside className="flex sm:hidden w-full flex-col border-r border-zinc-700/50 bg-zinc-950"
        style={{ display: selectedId ? 'none' : undefined }}
      >
        <div className="px-4 pt-5 pb-4 shrink-0">
          <h1 className="text-lg font-bold text-indigo-400">
            Painel de Atendimentos
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Monitoramento em tempo real
          </p>
        </div>
        <div className="border-t border-zinc-700/50" />
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      </aside>

      {/* Main chat area */}
      <main className={`flex-1 flex flex-col ${selectedId ? '' : 'hidden sm:flex'}`}>
        {error && !connected && (
          <div className="px-4 py-2 bg-red-900/30 text-red-400 text-xs text-center shrink-0">
            {error}
          </div>
        )}
        <ChatWindow
          conversation={activeConversation}
          connected={connected}
          onBack={() => setSelectedId(null)}
          showBack={!!selectedId}
        />
      </main>
    </div>
  );
}

export default App;
