function Bone({ className = '' }: { className?: string }) {
  return (
    <div
      className={`skeleton ${className}`}
      aria-hidden="true"
    />
  );
}

export function ConversationListSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 px-3 py-3.5 border-l-2"
          style={{
            borderLeftColor: 'transparent',
            animationDelay: `${i * 60}ms`,
          }}
        >
          <Bone className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <Bone className="h-3.5 w-28 rounded" />
              <Bone className="h-3 w-10 rounded shrink-0" />
            </div>
            <Bone className="h-3 w-full rounded" />
            <Bone className="h-3 w-3/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div
      className="flex-1 flex flex-col h-full"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      {/* Header skeleton */}
      <div
        className="flex items-center gap-3 px-6 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border-default)' }}
      >
        <Bone className="w-9 h-9 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <Bone className="h-3.5 w-36 rounded" />
          <Bone className="h-2.5 w-52 rounded" />
        </div>
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 px-6 py-5 space-y-5">
        {[
          { align: 'start', widths: ['w-52', 'w-40'] },
          { align: 'end',   widths: ['w-44'] },
          { align: 'start', widths: ['w-64', 'w-56', 'w-32'] },
          { align: 'end',   widths: ['w-36', 'w-48'] },
          { align: 'start', widths: ['w-48'] },
        ].map((group, i) => (
          <div
            key={i}
            className={`flex flex-col gap-1 ${group.align === 'end' ? 'items-end' : 'items-start'}`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {group.widths.map((w, j) => (
              <Bone
                key={j}
                className={`h-10 ${w} rounded-2xl ${
                  j === 0
                    ? group.align === 'end' ? 'rounded-tr-sm' : 'rounded-tl-sm'
                    : ''
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
