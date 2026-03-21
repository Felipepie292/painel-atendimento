import { useState, useEffect, useCallback } from 'react';
import type { Metrics } from '../types';
import { getAuthHeaders } from '../hooks/useAuth';

function formatResponseTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (minutes < 60) return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  return `${hours}h ${remainMinutes}m`;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
  index: number;
}

function MetricCard({ label, value, icon, accent = 'var(--brand-500)', index }: MetricCardProps) {
  return (
    <div
      className="animate-fade-in flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-sm)',
        animationDelay: `${index * 60}ms`,
      }}
    >
      <div
        className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
        style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)` }}
      >
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <div
          className="text-xl font-bold leading-tight tabular-nums"
          style={{ color: 'var(--text-primary)' }}
        >
          {value}
        </div>
        <div
          className="text-[11px] leading-tight mt-0.5 truncate font-medium uppercase tracking-wide"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

export function MetricsBar() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/metrics', { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = (await res.json()) as Metrics;
      setMetrics(data);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    void fetchMetrics();
    const interval = setInterval(() => void fetchMetrics(), 30_000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const cards: Omit<MetricCardProps, 'index'>[] = [
    {
      label: 'Atendimentos Hoje',
      value: metrics?.total_today ?? '—',
      accent: 'var(--brand-500)',
      icon: (
        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        </svg>
      ),
    },
    {
      label: 'Ativos Agora',
      value: metrics?.active_now ?? '—',
      accent: 'var(--success)',
      icon: (
        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.788m13.788 0c3.808 3.808 3.808 9.98 0 13.788M12 12h.008v.008H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      ),
    },
    {
      label: 'Tempo Médio',
      value: metrics ? formatResponseTime(metrics.avg_response_time_seconds) : '—',
      accent: 'var(--warning)',
      icon: (
        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Mensagens Hoje',
      value: metrics?.total_messages_today ?? '—',
      accent: 'var(--info)',
      icon: (
        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
      ),
    },
  ];

  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-4 py-3 shrink-0"
      style={{ borderBottom: '1px solid var(--border-default)' }}
    >
      {cards.map((card, i) => (
        <MetricCard key={card.label} {...card} index={i} />
      ))}
    </div>
  );
}
