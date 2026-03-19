import type { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  isAgent: boolean;
}

function formatRelativeTimestamp(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'agora';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'agora';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `h\u00e1 ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `h\u00e1 ${hours}h`;

  const date = new Date(timestamp);
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MessageBubble({ message, isAgent }: MessageBubbleProps) {
  return (
    <div
      className={`flex ${isAgent ? 'justify-end' : 'justify-start'} animate-fade-in`}
    >
      <div className={`max-w-[70%] flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}>
        <div
          className={`
            px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words
            ${isAgent
              ? 'dark:bg-indigo-600 bg-indigo-500 text-white rounded-2xl rounded-tr-sm'
              : 'dark:bg-zinc-700/70 bg-gray-200 dark:text-zinc-100 text-zinc-900 rounded-2xl rounded-tl-sm'
            }
          `}
        >
          {message.message}
        </div>
        <div className={`flex items-center gap-1.5 mt-1 px-1 ${isAgent ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] dark:text-zinc-500 text-zinc-400">
            {formatRelativeTimestamp(message.timestamp)}
          </span>
          {isAgent && (
            <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l4.5 4.5 9-10.5M9 12.75l1.5 1.5M14.25 7.5l-4.5 5.25" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
