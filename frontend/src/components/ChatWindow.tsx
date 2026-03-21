import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Conversation } from '../types';
import { MessageBubble } from './MessageBubble';
import { DateSeparator } from './DateSeparator';

interface ChatWindowProps {
  conversation: Conversation | null;
  connected: boolean;
  onFinish?: (id: string) => void;
  onBack?: () => void;
  showBack?: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] ?? '?').toUpperCase();
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
  return `${Math.floor(hours / 24)}d`;
}

function formatDuration(start: string, end: string): string {
  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  if (diffMs < 0) return '-';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  if (hours < 24) return remainMin > 0 ? `${hours}h ${remainMin}min` : `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function isSameDay(d1: string, d2: string): boolean {
  const a = new Date(d1);
  const b = new Date(d2);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function exportConversation(conversation: Conversation): void {
  const lines = conversation.messages.map((m) => {
    const time = new Date(m.timestamp).toLocaleString('pt-BR');
    const role = m.role === 'agent' ? 'Agente' : m.name;
    return `[${time}] ${role}: ${m.message}`;
  });
  const text = `Conversa: ${conversation.name}\nID: ${conversation.conversation_id}\n\n${lines.join('\n')}`;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `conversa-${conversation.conversation_id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

const TAG_STYLES: Record<string, { bg: string; color: string; prefix?: string }> = {
  'Risco de churn': { bg: 'var(--danger-bg)', color: 'var(--danger)', prefix: '⚠ ' },
  'Urgente':        { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  'Elogio':         { bg: 'var(--success-bg)', color: 'var(--success)' },
  'Comercial':      { bg: 'var(--brand-50)', color: 'var(--brand-500)' },
  'Suporte':        { bg: 'var(--brand-50)', color: 'var(--brand-500)' },
};

function getTagStyle(tag: string) {
  return TAG_STYLES[tag] ?? { bg: 'var(--bg-subtle)', color: 'var(--text-secondary)' };
}

function ActionButton({
  onClick,
  children,
  variant = 'default',
}: {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'success';
}) {
  const baseStyle =
    variant === 'success'
      ? {
          backgroundColor: 'color-mix(in srgb, var(--success) 12%, transparent)',
          color: 'var(--success)',
          border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)',
        }
      : {
          backgroundColor: 'var(--bg-subtle)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-default)',
        };

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
      style={baseStyle}
      onMouseEnter={(e) => {
        if (variant === 'success') {
          e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--success) 20%, transparent)';
        } else {
          e.currentTarget.style.backgroundColor = 'var(--border-default)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }
      }}
      onMouseLeave={(e) => {
        Object.assign(e.currentTarget.style, baseStyle);
      }}
    >
      {children}
    </button>
  );
}

export function ChatWindow({ conversation, connected, onFinish, onBack, showBack }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  const handleFinish = useCallback(() => {
    if (conversation && onFinish) onFinish(conversation.conversation_id);
  }, [conversation, onFinish]);

  const handleExport = useCallback(() => {
    if (conversation) exportConversation(conversation);
  }, [conversation]);

  if (!conversation) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-base)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{ backgroundColor: 'var(--bg-subtle)' }}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1} style={{ color: 'var(--text-tertiary)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Nenhuma conversa selecionada
          </p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Selecione uma conversa na lista ao lado
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            {['J', 'K'].map((key) => (
              <kbd
                key={key}
                className="text-[11px] px-1.5 py-0.5 rounded font-mono"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-tertiary)',
                }}
              >
                {key}
              </kbd>
            ))}
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>para navegar</span>
          </div>
        </motion.div>
      </div>
    );
  }

  const initials = getInitials(conversation.name);
  const avatarColor = getAvatarColor(conversation.name);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={conversation.conversation_id}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -6 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 flex flex-col h-full"
        style={{ backgroundColor: 'var(--bg-base)' }}
      >
        {/* Info bar */}
        <div
          className="flex items-center justify-between px-4 lg:px-5 py-3 shrink-0 glass"
          style={{
            borderBottom: '1px solid var(--border-default)',
            backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 85%, transparent)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {showBack && onBack && (
              <button
                onClick={onBack}
                className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150"
                aria-label="Voltar"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-subtle)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
            )}

            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {conversation.name}
                </h2>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0"
                  style={
                    conversation.status === 'active'
                      ? { backgroundColor: 'var(--success-bg)', color: 'var(--success)', border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)' }
                      : { backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }
                  }
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: conversation.status === 'active' ? 'var(--success)' : 'var(--text-tertiary)' }}
                  />
                  {conversation.status === 'active' ? 'Ativo' : 'Finalizado'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-[11px] mt-0.5 flex-wrap" style={{ color: 'var(--text-tertiary)' }}>
                <span className="font-mono">{conversation.conversation_id}</span>
                {conversation.first_message_at && (
                  <span>há {formatRelativeTime(conversation.first_message_at)}</span>
                )}
                {conversation.first_message_at && conversation.last_message_at && (
                  <span className="hidden sm:inline">
                    {formatDuration(conversation.first_message_at, conversation.last_message_at)}
                  </span>
                )}
                {typeof conversation.satisfaction_score === 'number' && (
                  <span
                    className="hidden sm:inline font-medium"
                    style={{
                      color:
                        conversation.satisfaction_score >= 70 ? 'var(--success)' :
                        conversation.satisfaction_score >= 40 ? 'var(--warning)' :
                        'var(--danger)',
                    }}
                  >
                    ★ {conversation.satisfaction_score}%
                  </span>
                )}
              </div>

              {conversation.tags && conversation.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {conversation.tags.map((tag) => {
                    const ts = getTagStyle(tag);
                    return (
                      <span
                        key={tag}
                        className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full"
                        style={{ backgroundColor: ts.bg, color: ts.color }}
                      >
                        {ts.prefix}{tag}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            {conversation.status === 'active' && onFinish && (
              <ActionButton onClick={handleFinish} variant="success">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l4.5 4.5 9-10.5" />
                </svg>
                Finalizar
              </ActionButton>
            )}
            <ActionButton onClick={handleExport}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Exportar
            </ActionButton>
          </div>
        </div>

        {/* Connection banner */}
        <AnimatePresence>
          {!connected && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-2 text-xs text-center shrink-0 overflow-hidden"
              style={{
                backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger)',
                borderBottom: '1px solid color-mix(in srgb, var(--danger) 15%, transparent)',
              }}
            >
              Conexão perdida — reconectando...
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-5 space-y-1.5">
          {conversation.messages.map((msg, idx) => {
            const showDateSeparator =
              idx === 0 ||
              !isSameDay(conversation.messages[idx - 1].timestamp, msg.timestamp);

            return (
              <div key={`${msg.conversation_id}-${msg.timestamp}-${idx}`}>
                {showDateSeparator && <DateSeparator date={msg.timestamp} />}
                <MessageBubble message={msg} isAgent={msg.role === 'agent'} />
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
