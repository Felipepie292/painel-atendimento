import type { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  isAgent: boolean;
}

/**
 * Formats a timestamp into HH:MM format.
 */
function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Renders a single message bubble, aligned left for clients and right for agents.
 */
export function MessageBubble({ message, isAgent }: MessageBubbleProps) {
  return (
    <div
      className={`flex ${isAgent ? 'justify-end' : 'justify-start'} animate-fade-in`}
    >
      <div className={`max-w-[70%] ${isAgent ? 'items-end' : 'items-start'}`}>
        <div
          className={`
            px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words
            ${isAgent
              ? 'bg-indigo-600 text-zinc-100 rounded-lg rounded-tr-sm'
              : 'bg-zinc-700/80 text-zinc-100 rounded-lg rounded-tl-sm'
            }
          `}
        >
          {message.message}
        </div>
        <p
          className={`text-[10px] text-zinc-500 mt-1 px-1 ${isAgent ? 'text-right' : 'text-left'}`}
        >
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}
