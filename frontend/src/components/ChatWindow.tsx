import { useEffect, useRef } from 'react';
import type { Conversation } from '../types';
import { MessageBubble } from './MessageBubble';

interface ChatWindowProps {
  conversation: Conversation | null;
  connected: boolean;
  onBack?: () => void;
  showBack?: boolean;
}

/**
 * Displays the active conversation's messages with a header and auto-scrolling.
 */
export function ChatWindow({ conversation, connected, onBack, showBack }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-900">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-700/50 shrink-0">
        <div className="flex items-center gap-3">
          {showBack && onBack && (
            <button
              onClick={onBack}
              className="sm:hidden text-zinc-400 hover:text-zinc-100 transition-colors"
              aria-label="Voltar para lista de conversas"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {conversation ? (
            <h2 className="text-sm font-semibold text-zinc-100">
              {conversation.name}
            </h2>
          ) : (
            <h2 className="text-sm font-semibold text-zinc-500">
              Painel de Atendimentos
            </h2>
          )}
        </div>
        <div className="flex items-center gap-2" role="status" aria-live="polite">
          <span
            aria-hidden="true"
            className={`inline-block w-2 h-2 rounded-full ${
              connected ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
          <span className="text-xs text-zinc-400">
            {connected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
      </header>

      {/* Messages area */}
      {conversation ? (
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {conversation.messages.map((msg, idx) => (
            <MessageBubble
              key={`${msg.conversation_id}-${msg.timestamp}-${idx}`}
              message={msg}
              isAgent={msg.role === 'agent'}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-zinc-500 text-sm">
            Selecione uma conversa para visualizar
          </p>
        </div>
      )}
    </div>
  );
}
