export function ConversationListSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-3 py-3 animate-pulse">
          <div className="w-10 h-10 rounded-full dark:bg-zinc-800 bg-zinc-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 dark:bg-zinc-800 bg-zinc-200 rounded" />
              <div className="h-3 w-8 dark:bg-zinc-800 bg-zinc-200 rounded" />
            </div>
            <div className="h-3 w-40 dark:bg-zinc-800 bg-zinc-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex-1 flex flex-col dark:bg-zinc-900 bg-gray-50 animate-pulse">
      <div className="flex items-center gap-3 px-6 py-3 border-b dark:border-zinc-800 border-zinc-200">
        <div className="w-9 h-9 rounded-full dark:bg-zinc-800 bg-zinc-200" />
        <div className="space-y-1.5">
          <div className="h-3.5 w-28 dark:bg-zinc-800 bg-zinc-200 rounded" />
          <div className="h-2.5 w-40 dark:bg-zinc-800 bg-zinc-200 rounded" />
        </div>
      </div>
      <div className="flex-1 px-6 py-4 space-y-4">
        <div className="flex justify-start"><div className="h-12 w-52 dark:bg-zinc-800 bg-zinc-200 rounded-xl" /></div>
        <div className="flex justify-end"><div className="h-12 w-44 dark:bg-zinc-800 bg-zinc-200 rounded-xl" /></div>
        <div className="flex justify-start"><div className="h-12 w-60 dark:bg-zinc-800 bg-zinc-200 rounded-xl" /></div>
        <div className="flex justify-end"><div className="h-12 w-36 dark:bg-zinc-800 bg-zinc-200 rounded-xl" /></div>
      </div>
    </div>
  );
}
