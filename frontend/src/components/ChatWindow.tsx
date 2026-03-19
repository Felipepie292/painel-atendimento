import { useEffect, useRef, useCallback } from 'react';
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
  'bg-indigo-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600',
  'bg-violet-600', 'bg-cyan-600', 'bg-pink-600', 'bg-teal-600',
  'bg-orange-600', 'bg-sky-600',
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
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatDuration(start: string, end: string): string {
  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  if (diffMs < 0) return '-';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  if (hours < 24) return remainMin > 0 ? `${hours}h ${remainMin}min` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
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

export function ChatWindow({ conversation, connected, onFinish, onBack, showBack }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  const handleFinish = useCallback(() => {
    if (conversation && onFinish) {
      onFinish(conversation.conversation_id);
    }
  }, [conversation, onFinish]);

  const handleExport = useCallback(() => {
    if (conversation) {
      exportConversation(conversation);
    }
  }, [conversation]);

  // Empty state
  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center dark:bg-zinc-900 bg-gray-50 transition-colors duration-200">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto dark:text-zinc-700 text-zinc-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
          <p className="dark:text-zinc-500 text-zinc-400 text-sm font-medium">
            Selecione uma conversa para visualizar
          </p>
          <p className="dark:text-zinc-600 text-zinc-300 text-xs mt-1">
            Escolha uma conversa na lista ao lado
          </p>
        </div>
      </div>
    );
  }

  const initials = getInitials(conversation.name);
  const avatarColor = getAvatarColor(conversation.name);

  return (
    <div className="flex-1 flex flex-col h-full dark:bg-zinc-900 bg-gray-50 transition-colors duration-200">
      {/* Info bar */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-3 border-b shrink-0
        dark:border-zinc-800 border-zinc-200 dark:bg-zinc-900/80 bg-white/80 backdrop-blur-sm
        transition-colors duration-200">
        <div className="flex items-center gap-3 min-w-0">
          {showBack && onBack && (
            <button
              onClick={onBack}
              className="lg:hidden dark:text-zinc-400 dark:hover:text-zinc-100 text-zinc-600 hover:text-zinc-900 transition-colors"
              aria-label="Voltar para lista de conversas"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          <div className={`${avatarColor} w-9 h-9 rounded-full flex items-center justify-center shrink-0`}>
            <span className="text-xs font-semibold text-white">{initials}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold dark:text-zinc-100 text-zinc-900 truncate">
                {conversation.name}
              </h2>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium
                ${conversation.status === 'active'
                  ? 'dark:bg-emerald-500/15 dark:text-emerald-400 bg-emerald-50 text-emerald-600'
                  : 'dark:bg-zinc-700/50 dark:text-zinc-400 bg-zinc-100 text-zinc-500'
                }`}>
                <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${
                  conversation.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-400'
                }`} />
                {conversation.status === 'active' ? 'Ativo' : 'Finalizado'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] dark:text-zinc-500 text-zinc-400">
              <span>{conversation.conversation_id}</span>
              {conversation.first_message_at && (
                <span>Primeira msg: {formatRelativeTime(conversation.first_message_at)}</span>
              )}
              {conversation.first_message_at && conversation.last_message_at && (
                <span className="hidden sm:inline">
                  Dura\u00e7\u00e3o: {formatDuration(conversation.first_message_at, conversation.last_message_at)}
                </span>
              )}
              {typeof conversation.satisfaction_score === 'number' && (
                <span className={`hidden sm:inline font-medium ${
                  conversation.satisfaction_score >= 70 ? 'dark:text-emerald-400 text-emerald-600' :
                  conversation.satisfaction_score >= 40 ? 'dark:text-amber-400 text-amber-600' :
                  'dark:text-red-400 text-red-600'
                }`}>
                  Satisf: {conversation.satisfaction_score}%
                </span>
              )}
            </div>
            {/* Tags */}
            {conversation.tags && conversation.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {conversation.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`inline-block px-1.5 py-0.5 text-[9px] font-medium rounded
                      ${tag === 'Risco de churn'
                        ? 'dark:bg-red-500/20 dark:text-red-400 bg-red-50 text-red-600'
                        : tag === 'Urgente'
                        ? 'dark:bg-amber-500/20 dark:text-amber-400 bg-amber-50 text-amber-600'
                        : tag === 'Elogio'
                        ? 'dark:bg-emerald-500/20 dark:text-emerald-400 bg-emerald-50 text-emerald-600'
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
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {conversation.status === 'active' && onFinish && (
            <button
              onClick={handleFinish}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-100
                bg-gray-100 text-zinc-700 hover:bg-gray-200 hover:text-zinc-900
                transition-colors duration-150"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Finalizar
            </button>
          )}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-100
              bg-gray-100 text-zinc-700 hover:bg-gray-200 hover:text-zinc-900
              transition-colors duration-150"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Exportar
          </button>
        </div>
      </div>

      {/* Connection warning */}
      {!connected && (
        <div className="px-4 py-2 dark:bg-red-900/20 bg-red-50 text-red-500 dark:text-red-400 text-xs text-center shrink-0 border-b dark:border-red-900/30 border-red-100">
          Conex\u00e3o perdida. Reconectando...
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 space-y-2">
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
    </div>
  );
}
