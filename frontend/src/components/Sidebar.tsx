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
  keyboardIndex?: number;
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
  keyboardIndex = -1,
}: SidebarProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-elevated)' }}>
      {/* Search */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
            style={{ color: 'var(--text-tertiary)' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar conversas..."
            value={localSearch}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--brand-500)';
              e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--brand-500) 15%, transparent)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border-default)';
              e.target.style.boxShadow = 'none';
            }}
          />
          {localSearch && (
            <button
              onClick={() => handleSearchInput('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-3 pb-2 space-y-2 shrink-0">
        {/* Status pill tabs */}
        <div
          className="flex p-0.5 rounded-lg"
          style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}
        >
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => onStatusFilterChange(tab.value)}
                className="flex-1 px-2 py-1 text-xs font-medium rounded-md transition-all duration-150"
                style={{
                  backgroundColor: active ? 'var(--bg-elevated)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  boxShadow: active ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Period select */}
        <select
          value={periodFilter}
          onChange={(e) => onPeriodFilterChange(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs rounded-lg cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)',
            outline: 'none',
          }}
        >
          {PERIOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border-default)' }} />

      {/* Conversation list */}
      <ConversationList
        conversations={conversations}
        selectedId={selectedId}
        onSelect={onSelect}
        keyboardIndex={keyboardIndex}
      />
    </div>
  );
}
