import type { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  isAgent: boolean;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatRelativeTimestamp(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return formatTime(timestamp);

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'agora';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;

  return formatTime(timestamp);
}

export function MessageBubble({ message, isAgent }: MessageBubbleProps) {
  return (
    <div
      className={`flex animate-fade-in ${isAgent ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[72%] flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}
      >
        <div
          className="px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words"
          style={
            isAgent
              ? {
                  background: 'linear-gradient(135deg, var(--brand-500), var(--brand-600))',
                  color: '#fff',
                  borderRadius: '18px 18px 4px 18px',
                  boxShadow: '0 2px 8px color-mix(in srgb, var(--brand-600) 30%, transparent)',
                }
              : {
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '18px 18px 18px 4px',
                  boxShadow: 'var(--shadow-sm)',
                }
          }
        >
          {message.message}
        </div>

        <div
          className={`flex items-center gap-1 mt-1 px-1 ${isAgent ? 'flex-row-reverse' : ''}`}
        >
          <span
            className="text-[10px]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {formatRelativeTimestamp(message.timestamp)}
          </span>
          {isAgent && (
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              style={{ color: 'var(--brand-500)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l4.5 4.5 9-10.5" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
