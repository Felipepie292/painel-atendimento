import { useEffect, useState } from 'react';
import type { ConversationSummary } from '../types';

interface ConversationListProps {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const AVATAR_COLORS = [
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-violet-600',
  'bg-cyan-600',
  'bg-pink-600',
  'bg-teal-600',
  'bg-orange-600',
  'bg-sky-600',
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function getAvatarColor(name: string): string {
  return AVATAR_COLORS[hashString(name) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

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

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '\u2026';
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <svg className="w-10 h-10 mx-auto dark:text-zinc-700 text-zinc-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
          </svg>
          <p className="dark:text-zinc-500 text-zinc-400 text-sm">
            Nenhuma conversa ainda
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" role="listbox" aria-label="Lista de conversas">
      {conversations.map((conv) => {
        const isSelected = conv.id === selectedId;
        const initials = getInitials(conv.name);
        const avatarColor = getAvatarColor(conv.name);

        const isChurn = conv.tags?.includes('Risco de churn');

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            role="option"
            aria-selected={isSelected}
            className={`
              w-full text-left px-3 py-3 border-l-2 transition-all duration-150 flex items-start gap-3
              ${isSelected
                ? 'border-l-indigo-500 dark:bg-indigo-500/10 bg-indigo-50'
                : isChurn
                ? 'border-l-red-500 dark:bg-red-500/5 bg-red-50/50 dark:hover:bg-red-500/10 hover:bg-red-50'
                : 'border-l-transparent dark:hover:bg-zinc-800/60 hover:bg-gray-100'
              }
            `}
          >
            {/* Avatar */}
            <div className={`${avatarColor} w-10 h-10 rounded-full flex items-center justify-center shrink-0`}>
              <span className="text-xs font-semibold text-white">{initials}</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm font-medium dark:text-zinc-100 text-zinc-900 truncate">
                    {conv.name}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                      conv.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-500'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {conv.unread_count > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-indigo-500 rounded-full">
                      {conv.unread_count}
                    </span>
                  )}
                  <span className="text-[11px] dark:text-zinc-500 text-zinc-400">
                    {formatRelativeTime(conv.last_message_at)}
                  </span>
                </div>
              </div>
              <p className="text-xs dark:text-zinc-400 text-zinc-500 leading-relaxed truncate">
                {truncate(conv.last_message, 55)}
              </p>
              {/* Tags */}
              {conv.tags && conv.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {conv.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`inline-block px-1.5 py-0.5 text-[9px] font-medium rounded
                        ${tag === 'Risco de churn'
                          ? 'dark:bg-red-500/20 dark:text-red-400 bg-red-50 text-red-600'
                          : tag === 'Urgente'
                          ? 'dark:bg-amber-500/20 dark:text-amber-400 bg-amber-50 text-amber-600'
                          : 'dark:bg-zinc-700/50 dark:text-zinc-400 bg-zinc-100 text-zinc-500'
                        }
                      `}
                    >
                      {tag === 'Risco de churn' && '\u26A0 '}{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
