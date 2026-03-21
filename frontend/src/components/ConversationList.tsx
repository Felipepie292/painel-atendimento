import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ConversationSummary } from '../types';

interface ConversationListProps {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  keyboardIndex?: number;
}

const AVATAR_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6',
  '#f97316', '#0ea5e9',
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
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
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '\u2026';
}

const TAG_STYLES: Record<string, { bg: string; color: string; prefix?: string }> = {
  'Risco de churn': { bg: 'var(--danger-bg)', color: 'var(--danger)', prefix: '⚠ ' },
  'Urgente':        { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  'Elogio':         { bg: 'var(--success-bg)', color: 'var(--success)' },
};

function getTagStyle(tag: string) {
  return TAG_STYLES[tag] ?? { bg: 'var(--bg-subtle)', color: 'var(--text-secondary)' };
}

const itemVariants = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as number[] } },
  exit:    { opacity: 0, x: -4, transition: { duration: 0.15 } },
};

// Hover preview popover
function ConversationPreview({ conv }: { conv: ConversationSummary }) {
  return (
    <div className="w-64 p-3 space-y-2 pointer-events-none">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {conv.name}
        </span>
        <span className="text-[10px] shrink-0" style={{ color: 'var(--text-tertiary)' }}>
          {formatRelativeTime(conv.last_message_at)}
        </span>
      </div>
      <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--text-secondary)' }}>
        {conv.last_message}
      </p>
      {conv.tags && conv.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {conv.tags.map((tag) => {
            const tagStyle = getTagStyle(tag);
            return (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: tagStyle.bg, color: tagStyle.color }}
              >
                {tagStyle.prefix}{tag}
              </span>
            );
          })}
        </div>
      )}
      <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
        <span>{conv.message_count} msgs</span>
        <span className="flex items-center gap-1">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: conv.status === 'active' ? 'var(--success)' : 'var(--text-tertiary)' }}
          />
          {conv.status === 'active' ? 'Ativo' : 'Finalizado'}
        </span>
      </div>
    </div>
  );
}

export function ConversationList({ conversations, selectedId, onSelect, keyboardIndex = -1 }: ConversationListProps) {
  const [, setTick] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [previewPos, setPreviewPos] = useState<{ top: number; left: number } | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const handleMouseEnter = (id: string, e: React.MouseEvent) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredId(id);
      // Position to the right of the sidebar item
      setPreviewPos({ top: rect.top, left: rect.right + 8 });
    }, 400);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredId(null);
    setPreviewPos(null);
  };

  const hoveredConv = hoveredId ? conversations.find((c) => c.id === hoveredId) : null;

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="text-center animate-fade-in">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ backgroundColor: 'var(--bg-subtle)' }}
          >
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1}
              style={{ color: 'var(--text-tertiary)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Nenhuma conversa encontrada
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Aguardando novos atendimentos
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto" role="listbox" aria-label="Lista de conversas">
        <AnimatePresence mode="popLayout" initial={false}>
          {conversations.map((conv, index) => {
            const isSelected = conv.id === selectedId;
            const isKeyboardFocused = index === keyboardIndex;
            const isChurn = conv.tags?.includes('Risco de churn');
            const avatarColor = getAvatarColor(conv.name);
            const initials = getInitials(conv.name);

            return (
              <motion.button
                key={conv.id}
                layout
                data-list-index={index}
                variants={itemVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                onClick={() => onSelect(conv.id)}
                onMouseEnter={(e) => {
                  handleMouseEnter(conv.id, e);
                  if (!isSelected && !isKeyboardFocused) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-subtle)';
                  }
                }}
                onMouseLeave={(e) => {
                  handleMouseLeave();
                  if (!isSelected && !isKeyboardFocused) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                  }
                }}
                role="option"
                aria-selected={isSelected}
                className="w-full text-left flex items-start gap-3 px-3 py-3"
                style={{
                  borderLeft: `2px solid ${
                    isSelected
                      ? 'var(--brand-500)'
                      : isKeyboardFocused
                      ? 'var(--brand-400)'
                      : isChurn
                      ? 'var(--danger)'
                      : 'transparent'
                  }`,
                  backgroundColor: isSelected
                    ? 'color-mix(in srgb, var(--brand-500) 8%, transparent)'
                    : isKeyboardFocused
                    ? 'color-mix(in srgb, var(--brand-500) 5%, transparent)'
                    : 'transparent',
                  outline: isKeyboardFocused && !isSelected ? '1px solid color-mix(in srgb, var(--brand-500) 30%, transparent)' : 'none',
                  outlineOffset: '-1px',
                  cursor: 'pointer',
                }}
                whileTap={{ scale: 0.995 }}
              >
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white"
                  style={{ backgroundColor: avatarColor }}
                >
                  <span className="text-xs font-bold">{initials}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Row 1: name + time */}
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="text-sm font-medium truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {conv.name}
                      </span>
                      {conv.status === 'active' && (
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: 'var(--success)' }}
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {conv.unread_count > 0 && (
                        <span
                          className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white rounded-full"
                          style={{ backgroundColor: 'var(--brand-500)' }}
                        >
                          {conv.unread_count}
                        </span>
                      )}
                      <span
                        className="text-[11px] tabular-nums"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {formatRelativeTime(conv.last_message_at)}
                      </span>
                      {/* Enter hint when keyboard focused */}
                      {isKeyboardFocused && (
                        <kbd
                          className="text-[9px] border rounded px-1 font-mono"
                          style={{
                            borderColor: 'var(--border-default)',
                            color: 'var(--text-tertiary)',
                            backgroundColor: 'var(--bg-subtle)',
                          }}
                        >
                          ↵
                        </kbd>
                      )}
                    </div>
                  </div>

                  {/* Row 2: last message */}
                  <p
                    className="text-xs leading-relaxed truncate"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {truncate(conv.last_message, 58)}
                  </p>

                  {/* Tags */}
                  {conv.tags && conv.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {conv.tags.map((tag) => {
                        const tagStyle = getTagStyle(tag);
                        return (
                          <span
                            key={tag}
                            className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full"
                            style={{
                              backgroundColor: tagStyle.bg,
                              color: tagStyle.color,
                            }}
                          >
                            {tagStyle.prefix}{tag}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Hover preview popover */}
      <AnimatePresence>
        {hoveredConv && previewPos && (
          <motion.div
            className="fixed z-40 rounded-xl shadow-xl border"
            style={{
              top: previewPos.top,
              left: previewPos.left,
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-default)',
            }}
            initial={{ opacity: 0, x: -4, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -4, scale: 0.97 }}
            transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
          >
            <ConversationPreview conv={hoveredConv} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
