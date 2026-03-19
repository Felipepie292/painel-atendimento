interface DateSeparatorProps {
  date: string;
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffDays = Math.round(
    (todayOnly.getTime() - dateOnly.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';

  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
  });
}

export function DateSeparator({ date }: DateSeparatorProps) {
  const label = formatDateLabel(date);

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-zinc-700/50 dark:bg-zinc-700/50 light-separator" />
      <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-500 shrink-0 uppercase tracking-wider">
        {label}
      </span>
      <div className="flex-1 h-px bg-zinc-700/50 dark:bg-zinc-700/50 light-separator" />
    </div>
  );
}
