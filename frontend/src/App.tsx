import { useState, useEffect, useCallback, useRef } from 'react';
import type { Conversation, ConversationSummary, Message } from './types';
import { useWebSocket } from './hooks/useWebSocket';
import { useTheme } from './hooks/useTheme';
import { playNotificationSound } from './hooks/useSound';
import { useAuth, getAuthHeaders } from './hooks/useAuth';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useNotifications } from './hooks/useNotifications';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MetricsBar } from './components/MetricsBar';
import { ChatWindow } from './components/ChatWindow';
import { LoginPage } from './components/LoginPage';
import { AnalyticsPage } from './components/AnalyticsPage';
import { CommandPalette } from './components/CommandPalette';
import type { PaletteCommand } from './components/CommandPalette';

function messageKey(msg: Message): string {
  return `${msg.conversation_id}:${msg.timestamp}:${msg.message}`;
}

function App() {
  const { isAuthenticated, authRequired, loading: authLoading, login, logout } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [keyboardIndex, setKeyboardIndex] = useState(-1);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('painel_sound');
    return saved !== 'false';
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState('today');

  const { connected, lastMessage } = useWebSocket();
  const { theme, toggleTheme } = useTheme();
  const { notify, requestPermission } = useNotifications();

  const lastProcessedRef = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);

  // Request notification permission on first auth
  useEffect(() => {
    if (isAuthenticated) {
      void requestPermission();
    }
  }, [isAuthenticated, requestPermission]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    localStorage.setItem('painel_sound', String(soundEnabled));
  }, [soundEnabled]);

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
      const res = await fetch(url, { headers: getAuthHeaders() });
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
        headers: getAuthHeaders(),
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
      const res = await fetch(`/api/conversations/${id}/finish`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      if (!res.ok) return;
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
    if (isAuthenticated) {
      void fetchConversations();
    }
  }, [fetchConversations, isAuthenticated]);

  // Handle WebSocket new_message events
  useEffect(() => {
    if (!lastMessage) return;

    const key = messageKey(lastMessage);
    if (lastProcessedRef.current === key) return;
    lastProcessedRef.current = key;

    // Play notification sound for client messages
    if (lastMessage.role === 'client' && soundEnabled) {
      playNotificationSound();
    }

    // Browser notification
    if (lastMessage.role === 'client') {
      notify(`Nova mensagem de ${lastMessage.name}`, lastMessage.message);
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
        tags: [],
        satisfaction_score: 50,
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
  }, [lastMessage, soundEnabled, notify]);

  /** Handle conversation selection */
  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      setSidebarOpen(false);
      setShowAnalytics(false);
      setKeyboardIndex(-1);
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
    setKeyboardIndex(-1);
  }, []);

  // Scroll keyboard-focused item into view
  const scrollKeyboardItem = useCallback((index: number) => {
    const el = document.querySelector(`[data-list-index="${index}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);

  // Keyboard shortcuts
  const handleNext = useCallback(() => {
    if (conversations.length === 0) return;
    setKeyboardIndex((prev) => {
      const next = prev < conversations.length - 1 ? prev + 1 : 0;
      scrollKeyboardItem(next);
      return next;
    });
  }, [conversations, scrollKeyboardItem]);

  const handlePrevious = useCallback(() => {
    if (conversations.length === 0) return;
    setKeyboardIndex((prev) => {
      const next = prev > 0 ? prev - 1 : conversations.length - 1;
      scrollKeyboardItem(next);
      return next;
    });
  }, [conversations, scrollKeyboardItem]);

  // Enter to open keyboard-focused conversation
  const handleEnterSelect = useCallback(() => {
    if (keyboardIndex >= 0 && conversations[keyboardIndex]) {
      handleSelect(conversations[keyboardIndex].id);
    }
  }, [keyboardIndex, conversations, handleSelect]);

  const handleEscape = useCallback(() => {
    if (keyboardIndex >= 0) {
      setKeyboardIndex(-1);
    } else {
      handleBack();
    }
  }, [keyboardIndex, handleBack]);

  const toggleAnalytics = useCallback(() => {
    setShowAnalytics((prev) => !prev);
  }, []);

  const toggleFocusMode = useCallback(() => {
    setFocusMode((prev) => !prev);
  }, []);

  const openPalette = useCallback(() => {
    setPaletteOpen(true);
  }, []);

  useKeyboardShortcuts({
    onNext: handleNext,
    onPrevious: handlePrevious,
    onEscape: handleEscape,
    onAnalytics: toggleAnalytics,
    onCommandPalette: openPalette,
    onFocusMode: toggleFocusMode,
  });

  // Enter key for keyboard-focused conversation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter' && keyboardIndex >= 0) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        handleEnterSelect();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardIndex, handleEnterSelect]);

  // Build command palette commands
  const paletteCommands: PaletteCommand[] = [
    {
      id: 'toggle-theme',
      label: 'Alternar tema',
      description: theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      ),
      shortcut: [],
      action: toggleTheme,
      group: 'Configurações',
    },
    {
      id: 'toggle-analytics',
      label: showAnalytics ? 'Fechar analytics' : 'Abrir analytics',
      description: 'Ver métricas e gráficos de atendimentos',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
      shortcut: ['A'],
      action: toggleAnalytics,
      group: 'Navegação',
    },
    {
      id: 'toggle-focus',
      label: focusMode ? 'Sair do modo foco' : 'Modo foco',
      description: focusMode ? 'Restaurar layout padrão' : 'Maximizar chat, ocultar sidebar e métricas',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
        </svg>
      ),
      shortcut: ['F'],
      action: toggleFocusMode,
      group: 'Visualização',
    },
    {
      id: 'toggle-sound',
      label: soundEnabled ? 'Desativar som' : 'Ativar som',
      description: 'Notificações sonoras para novas mensagens',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
      ),
      shortcut: [],
      action: () => setSoundEnabled((prev) => !prev),
      group: 'Configurações',
    },
    {
      id: 'filter-active',
      label: 'Filtrar: Ativos',
      description: 'Mostrar apenas atendimentos ativos',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
        </svg>
      ),
      shortcut: [],
      action: () => { setStatusFilter('active'); setPaletteOpen(false); },
      group: 'Filtros',
    },
    {
      id: 'filter-finished',
      label: 'Filtrar: Finalizados',
      description: 'Mostrar apenas atendimentos finalizados',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      shortcut: [],
      action: () => { setStatusFilter('finished'); setPaletteOpen(false); },
      group: 'Filtros',
    },
    {
      id: 'filter-all',
      label: 'Filtrar: Todos',
      description: 'Remover filtro de status',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      shortcut: [],
      action: () => { setStatusFilter(''); setPaletteOpen(false); },
      group: 'Filtros',
    },
  ];

  // Auth loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen dark:bg-zinc-900 bg-gray-50">
        <div className="animate-pulse dark:text-zinc-500 text-zinc-400 text-sm">Carregando...</div>
      </div>
    );
  }

  // Login page
  if (authRequired && !isAuthenticated) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <div className="flex flex-col h-screen dark:bg-zinc-900 bg-gray-50 dark:text-zinc-100 text-zinc-900 transition-colors duration-200">
      {/* Command Palette */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={paletteCommands}
        conversations={conversations}
        onSelectConversation={handleSelect}
      />

      {/* Header */}
      {!focusMode && (
        <Header
          connected={connected}
          theme={theme}
          onToggleTheme={toggleTheme}
          activeCount={activeCount}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onToggleAnalytics={toggleAnalytics}
          onToggleSound={() => setSoundEnabled((prev) => !prev)}
          soundEnabled={soundEnabled}
          onLogout={authRequired ? logout : undefined}
        />
      )}

      {/* Focus mode minimal top bar */}
      {focusMode && (
        <div className="flex items-center justify-between px-4 h-10 border-b shrink-0
          dark:bg-zinc-950 dark:border-zinc-800 bg-white border-zinc-200">
          <span className="text-xs dark:text-zinc-500 text-zinc-400 font-medium">Modo foco</span>
          <button
            onClick={toggleFocusMode}
            className="text-xs dark:text-zinc-500 dark:hover:text-zinc-300 text-zinc-400 hover:text-zinc-700
              flex items-center gap-1 transition-colors"
            title="Sair do modo foco (F)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
            Sair
            <kbd className="text-[9px] border dark:border-zinc-700 border-zinc-300 rounded px-1 font-mono ml-0.5">F</kbd>
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar — hidden in focus mode */}
        {!focusMode && (
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
              keyboardIndex={keyboardIndex}
            />
          </aside>
        )}

        {/* Mobile sidebar overlay */}
        {sidebarOpen && !focusMode && (
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
                keyboardIndex={keyboardIndex}
              />
            </aside>
          </>
        )}

        {/* Main area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {showAnalytics ? (
            <AnalyticsPage onBack={() => setShowAnalytics(false)} />
          ) : (
            <>
              {!focusMode && <MetricsBar />}
              <ChatWindow
                conversation={activeConversation}
                connected={connected}
                onFinish={handleFinish}
                onBack={handleBack}
                showBack={!!selectedId}
              />
            </>
          )}
        </main>
      </div>

      {/* Focus mode shortcut hint when no conversation selected */}
      {!focusMode && !selectedId && conversations.length > 0 && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 text-[10px]
          dark:text-zinc-600 text-zinc-400 pointer-events-none">
          <kbd className="border dark:border-zinc-700 border-zinc-300 rounded px-1.5 py-0.5 font-mono bg-white dark:bg-zinc-900">⌘K</kbd>
          <span>palette</span>
          <span className="mx-1 opacity-40">·</span>
          <kbd className="border dark:border-zinc-700 border-zinc-300 rounded px-1.5 py-0.5 font-mono bg-white dark:bg-zinc-900">J</kbd>
          <kbd className="border dark:border-zinc-700 border-zinc-300 rounded px-1.5 py-0.5 font-mono bg-white dark:bg-zinc-900">K</kbd>
          <span>navegar</span>
          <span className="mx-1 opacity-40">·</span>
          <kbd className="border dark:border-zinc-700 border-zinc-300 rounded px-1.5 py-0.5 font-mono bg-white dark:bg-zinc-900">F</kbd>
          <span>foco</span>
        </div>
      )}
    </div>
  );
}

export default App;
