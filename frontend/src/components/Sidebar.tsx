import { useState, useCallback, useRef, useEffect } from 'react';
import type { ConversationSummary } from '../types';
import { ConversationList } from './ConversationList';

interface SidebarProps {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  periodFilter: string;
  onPeriodFilterChange: (period: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const STATUS_TABS = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'finished', label: 'Finalizados' },
];

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: '7days', label: '7 dias' },
  { value: '30days', label: '30 dias' },
  { value: '', label: 'Todos' },
];

export function Sidebar({
  conversations,
  selectedId,
  onSelect,
  statusFilter,
  onStatusFilterChange,
  periodFilter,
  onPeriodFilterChange,
  searchQuery,
  onSearchChange,
}: SidebarProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const handleSearchInput = useCallback(
    (value: string) => {
      setLocalSearch(value);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        onSearchChange(value);
      }, 300);
    },
    [onSearchChange]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-zinc-500 text-zinc-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar conversas..."
            value={localSearch}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border
              dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500
              bg-gray-100 border-zinc-300 text-zinc-900 placeholder-zinc-400
              focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40
              transition-colors duration-200"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-3 pb-2 space-y-2 shrink-0">
        {/* Status tabs */}
        <div className="flex gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onStatusFilterChange(tab.value)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors duration-150
                ${statusFilter === tab.value
                  ? 'dark:bg-indigo-500/20 dark:text-indigo-400 bg-indigo-50 text-indigo-600'
                  : 'dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-700 hover:bg-gray-100'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Period dropdown */}
        <select
          value={periodFilter}
          onChange={(e) => onPeriodFilterChange(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs rounded-lg border
            dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300
            bg-gray-100 border-zinc-300 text-zinc-700
            focus:outline-none focus:ring-2 focus:ring-indigo-500/40
            transition-colors duration-200 cursor-pointer"
        >
          {PERIOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Divider */}
      <div className="dark:border-zinc-800 border-zinc-200 border-t mx-3" />

      {/* Conversation list */}
      <ConversationList
        conversations={conversations}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </div>
  );
}
