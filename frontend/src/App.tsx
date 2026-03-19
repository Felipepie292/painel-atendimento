import { useState, useEffect, useCallback, useRef } from 'react';
import type { Conversation, ConversationSummary, Message } from './types';
import { useWebSocket } from './hooks/useWebSocket';
import { useTheme } from './hooks/useTheme';
import { playNotificationSound } from './hooks/useSound';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MetricsBar } from './components/MetricsBar';
import { ChatWindow } from './components/ChatWindow';

function messageKey(msg: Message): string {
  return `${msg.conversation_id}:${msg.timestamp}:${msg.message}`;
}

function App() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState('today');

  const { connected, lastMessage } = useWebSocket();
  const { theme, toggleTheme } = useTheme();

  const lastProcessedRef = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const activeCount = conversations.filter((c) => c.status === 'active').length;

  /** Fetch conversations with current filters */
  const fetchConversations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);
      if (periodFilter) params.set('period', periodFilter);
      const qs = params.toString();
      const url = qs ? `/api/conversations?${qs}` : '/api/conversations';
      const res = await fetch(url);
      if (!res.ok) return;
      const data = (await res.json()) as ConversationSummary[];
      setConversations(data);
    } catch {
      // silently fail
    }
  }, [statusFilter, searchQuery, periodFilter]);

  /** Fetch a single conversation */
  const fetchConversation = useCallback(async (id: string) => {
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
      if (!controller.signal.aborted) {
        setActiveConversation(data);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }, []);

  /** Finish a conversation */
  const handleFinish = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}/finish`, { method: 'PATCH' });
      if (!res.ok) return;
      // Refresh
      setActiveConversation((prev) => prev ? { ...prev, status: 'finished' } : prev);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: 'finished' as const } : c))
      );
    } catch {
      // silently fail
    }
  }, []);

  // Load conversations on mount and when filters change
  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  // Handle WebSocket new_message events
  useEffect(() => {
    if (!lastMessage) return;

    const key = messageKey(lastMessage);
    if (lastProcessedRef.current === key) return;
    lastProcessedRef.current = key;

    // Play notification sound for client messages
    if (lastMessage.role === 'client') {
      playNotificationSound();
    }

    // Update conversation list
    setConversations((prev) => {
      const existingIdx = prev.findIndex(
        (c) => c.id === lastMessage.conversation_id
      );

      if (existingIdx >= 0) {
        const updated = { ...prev[existingIdx] };
        updated.last_message = lastMessage.message;
        updated.last_message_at = lastMessage.timestamp;
        updated.message_count += 1;
        if (lastMessage.role === 'client' && lastMessage.conversation_id !== selectedIdRef.current) {
          updated.unread_count += 1;
        }
        return [updated, ...prev.filter((_, i) => i !== existingIdx)];
      }

      const newSummary: ConversationSummary = {
        id: lastMessage.conversation_id,
        name: lastMessage.name,
        last_message: lastMessage.message,
        message_count: 1,
        last_message_at: lastMessage.timestamp,
        status: 'active',
        unread_count: lastMessage.conversation_id !== selectedIdRef.current ? 1 : 0,
      };
      return [newSummary, ...prev];
    });

    // If the message belongs to the currently selected conversation, append it
    if (lastMessage.conversation_id === selectedIdRef.current) {
      setActiveConversation((prev) => {
        if (!prev) return prev;
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

  /** Handle conversation selection */
  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      setSidebarOpen(false);
      void fetchConversation(id);
      // Clear unread count
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
      );
    },
    [fetchConversation]
  );

  const handleBack = useCallback(() => {
    setSelectedId(null);
    setActiveConversation(null);
  }, []);

  return (
    <div className="flex flex-col h-screen dark:bg-zinc-900 bg-gray-50 dark:text-zinc-100 text-zinc-900 transition-colors duration-200">
      {/* Header */}
      <Header
        connected={connected}
        theme={theme}
        onToggleTheme={toggleTheme}
        activeCount={activeCount}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-[320px] min-w-[320px] flex-col border-r
          dark:border-zinc-800 dark:bg-zinc-950 border-zinc-200 bg-white
          transition-colors duration-200">
          <Sidebar
            conversations={conversations}
            selectedId={selectedId}
            onSelect={handleSelect}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            periodFilter={periodFilter}
            onPeriodFilterChange={setPeriodFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="lg:hidden fixed inset-y-0 left-0 w-[320px] z-50 flex flex-col
              dark:bg-zinc-950 bg-white
              shadow-2xl transition-colors duration-200"
              style={{ top: '56px' }}
            >
              <Sidebar
                conversations={conversations}
                selectedId={selectedId}
                onSelect={handleSelect}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                periodFilter={periodFilter}
                onPeriodFilterChange={setPeriodFilter}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </aside>
          </>
        )}

        {/* Main area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <MetricsBar />
          <ChatWindow
            conversation={activeConversation}
            connected={connected}
            onFinish={handleFinish}
            onBack={handleBack}
            showBack={!!selectedId}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
