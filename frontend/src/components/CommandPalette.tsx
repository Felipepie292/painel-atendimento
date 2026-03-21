import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ConversationSummary } from '../types';

export interface PaletteCommand {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string[];
  action: () => void;
  group?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: PaletteCommand[];
  conversations: ConversationSummary[];
  onSelectConversation: (id: string) => void;
}

function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t.includes(q)) return true;
  // Simple fuzzy: all chars of query must appear in order in text
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function CommandPalette({
  open,
  onClose,
  commands,
  conversations,
  onSelectConversation,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build combined results: matching commands + matching conversations
  const filteredCommands = query
    ? commands.filter((c) => fuzzyMatch(c.label, query) || fuzzyMatch(c.description ?? '', query))
    : commands;

  const filteredConversations = query
    ? conversations.filter(
        (c) => fuzzyMatch(c.name, query) || fuzzyMatch(c.last_message, query)
      )
    : [];

  type ResultItem =
    | { kind: 'command'; command: PaletteCommand }
    | { kind: 'conversation'; conversation: ConversationSummary };

  const results: ResultItem[] = [
    ...filteredCommands.map((c) => ({ kind: 'command' as const, command: c })),
    ...filteredConversations.map((c) => ({ kind: 'conversation' as const, conversation: c })),
  ];

  const handleSelect = useCallback(
    (item: ResultItem) => {
      if (item.kind === 'command') {
        item.command.action();
      } else {
        onSelectConversation(item.conversation.id);
      }
      onClose();
    },
    [onClose, onSelectConversation]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = results[activeIndex];
      if (item) handleSelect(item);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-palette-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const statusDot = (status: ConversationSummary['status']) =>
    status === 'active'
      ? 'bg-emerald-500'
      : 'bg-zinc-500';

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            className="fixed top-[18%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50
                       dark:bg-zinc-900 bg-white
                       border dark:border-zinc-700 border-zinc-200
                       rounded-xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-label="Command palette"
            aria-modal="true"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b dark:border-zinc-700 border-zinc-200">
              <svg className="w-4 h-4 dark:text-zinc-500 text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="O que você quer fazer?"
                className="flex-1 bg-transparent dark:text-zinc-100 text-zinc-900 text-sm
                           dark:placeholder-zinc-500 placeholder-zinc-400 outline-none"
                aria-label="Buscar ações"
                autoComplete="off"
              />
              <kbd className="text-[10px] dark:text-zinc-500 text-zinc-400
                              dark:border-zinc-600 border-zinc-300 border rounded px-1.5 py-0.5 font-mono shrink-0">
                ESC
              </kbd>
            </div>

            {/* Results list */}
            <div ref={listRef} className="max-h-80 overflow-y-auto py-1" role="listbox">
              {results.length === 0 ? (
                <p className="text-center text-sm dark:text-zinc-500 text-zinc-400 py-8">
                  Nenhum resultado{query ? ` para "${query}"` : ''}
                </p>
              ) : (
                <>
                  {/* Group label for commands */}
                  {filteredCommands.length > 0 && (
                    <div className="px-4 py-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider dark:text-zinc-500 text-zinc-400">
                        Ações
                      </span>
                    </div>
                  )}
                  {filteredCommands.map((cmd, i) => {
                    const isActive = activeIndex === i;
                    return (
                      <button
                        key={cmd.id}
                        data-palette-index={i}
                        role="option"
                        aria-selected={isActive}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-75
                          ${isActive
                            ? 'dark:bg-indigo-500/20 bg-indigo-50 dark:text-indigo-300 text-indigo-700'
                            : 'dark:text-zinc-200 text-zinc-800 dark:hover:bg-zinc-800 hover:bg-zinc-50'
                          }`}
                        onMouseEnter={() => setActiveIndex(i)}
                        onClick={() => handleSelect({ kind: 'command', command: cmd })}
                      >
                        {cmd.icon && (
                          <span className="w-4 h-4 shrink-0 dark:text-zinc-400 text-zinc-500">
                            {cmd.icon}
                          </span>
                        )}
                        <span className="flex-1 min-w-0">
                          <span className="text-sm font-medium block">{cmd.label}</span>
                          {cmd.description && (
                            <span className="text-xs dark:text-zinc-500 text-zinc-400 block truncate">
                              {cmd.description}
                            </span>
                          )}
                        </span>
                        {cmd.shortcut && (
                          <span className="flex gap-1 shrink-0">
                            {cmd.shortcut.map((k) => (
                              <kbd
                                key={k}
                                className="text-[10px] dark:border-zinc-600 border-zinc-300 border
                                           rounded px-1.5 py-0.5 font-mono dark:text-zinc-400 text-zinc-500"
                              >
                                {k}
                              </kbd>
                            ))}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Group label for conversations */}
                  {filteredConversations.length > 0 && (
                    <div className="px-4 py-1.5 mt-1 border-t dark:border-zinc-800 border-zinc-100">
                      <span className="text-[10px] font-semibold uppercase tracking-wider dark:text-zinc-500 text-zinc-400">
                        Conversas
                      </span>
                    </div>
                  )}
                  {filteredConversations.map((conv, i) => {
                    const idx = filteredCommands.length + i;
                    const isActive = activeIndex === idx;
                    return (
                      <button
                        key={conv.id}
                        data-palette-index={idx}
                        role="option"
                        aria-selected={isActive}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-75
                          ${isActive
                            ? 'dark:bg-indigo-500/20 bg-indigo-50 dark:text-indigo-300 text-indigo-700'
                            : 'dark:text-zinc-200 text-zinc-800 dark:hover:bg-zinc-800 hover:bg-zinc-50'
                          }`}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => handleSelect({ kind: 'conversation', conversation: conv })}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot(conv.status)}`} />
                        <span className="flex-1 min-w-0">
                          <span className="text-sm font-medium block">{conv.name}</span>
                          <span className="text-xs dark:text-zinc-500 text-zinc-400 block truncate">
                            {conv.last_message}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center gap-4 px-4 py-2 border-t dark:border-zinc-800 border-zinc-100">
              <span className="flex items-center gap-1 text-[10px] dark:text-zinc-600 text-zinc-400">
                <kbd className="border dark:border-zinc-700 border-zinc-300 rounded px-1 font-mono">↑↓</kbd>
                navegar
              </span>
              <span className="flex items-center gap-1 text-[10px] dark:text-zinc-600 text-zinc-400">
                <kbd className="border dark:border-zinc-700 border-zinc-300 rounded px-1 font-mono">↵</kbd>
                selecionar
              </span>
              <span className="flex items-center gap-1 text-[10px] dark:text-zinc-600 text-zinc-400">
                <kbd className="border dark:border-zinc-700 border-zinc-300 rounded px-1 font-mono">ESC</kbd>
                fechar
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
