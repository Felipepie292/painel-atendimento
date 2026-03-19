import { useEffect, useState } from 'react';
import type { ConversationSummary } from '../types';

interface ConversationListProps {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Formats a timestamp into a human-readable relative time string.
 */
function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'agora';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'agora';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/**
 * Truncates a string to the given max length, appending ellipsis if needed.
 */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '\u2026';
}

/**
 * Displays a scrollable list of conversation summaries.
 * Re-renders every 60 seconds to keep relative timestamps fresh.
 */
export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  // Force re-render every 60s to keep relative timestamps up to date
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <p className="text-zinc-500 text-sm text-center">
          Nenhuma conversa ainda.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" role="listbox" aria-label="Lista de conversas">
      {conversations.map((conv) => {
        const isSelected = conv.id === selectedId;

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            role="option"
            aria-selected={isSelected}
            className={`
              w-full text-left px-4 py-3 border-l-2 transition-colors duration-150
              ${isSelected
                ? 'bg-indigo-500/20 border-l-indigo-500'
                : 'border-l-transparent hover:bg-zinc-800/60'
              }
            `}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-zinc-100 truncate mr-2">
                {conv.name}
              </span>
              <span className="text-xs text-zinc-500 shrink-0">
                {formatRelativeTime(conv.last_message_at)}
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {truncate(conv.last_message, 50)}
            </p>
          </button>
        );
      })}
    </div>
  );
}
