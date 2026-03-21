import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { Analytics } from '../types';
import { getAuthHeaders } from '../hooks/useAuth';

const PERIOD_OPTIONS = [
  { value: '30days', label: 'Últimos 30 dias' },
  { value: '7days', label: 'Últimos 7 dias' },
  { value: 'today', label: 'Hoje' },
];

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}

function BarChart({ data, labelKey, valueKey, color }: {
  data: { [key: string]: string | number }[];
  labelKey: string;
  valueKey: string;
  color: string;
}) {
  const maxVal = Math.max(...data.map((d) => d[valueKey] as number), 1);

  return (
    <div className="space-y-1.5">
      {data.map((item, i) => {
        const pct = ((item[valueKey] as number) / maxVal) * 100;
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[11px] w-8 text-right shrink-0 tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
              {item[labelKey]}
            </span>
            <div
              className="flex-1 h-5 rounded overflow-hidden"
              style={{ backgroundColor: 'var(--bg-subtle)' }}
            >
              <motion.div
                className="h-full rounded"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <span className="text-[11px] w-6 shrink-0 tabular-nums" style={{ color: 'var(--text-secondary)' }}>
              {item[valueKey]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TrendLine({ data }: { data: { date: string; count: number }[] }) {
  if (data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const width = 100;
  const height = 40;
  const padding = 2;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
    const y = height - padding - ((d.count / maxVal) * (height - padding * 2));
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32" preserveAspectRatio="none">
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand-500)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--brand-500)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#trendGrad)" />
      <polyline
        points={points}
        fill="none"
        stroke="var(--brand-500)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KpiCard({
  label,
  value,
  valueColor,
  index,
}: {
  label: string;
  value: string;
  valueColor: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl p-4"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums" style={{ color: valueColor }}>
        {value}
      </div>
    </motion.div>
  );
}

function ChartCard({ title, children, index }: { title: string; children: React.ReactNode; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl p-5"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      {children}
    </motion.div>
  );
}

export function AnalyticsPage({ onBack }: { onBack: () => void }) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [period, setPeriod] = useState('30days');
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${period}`, { headers: getAuthHeaders() });
      if (res.ok) setAnalytics(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [period]);

  useEffect(() => { void fetchAnalytics(); }, [fetchAnalytics]);

  const handleExportCSV = useCallback(() => {
    const a = document.createElement('a');
    a.href = `/api/export/csv?period=${period}`;
    a.download = '';
    a.click();
  }, [period]);

  const handleExportReport = useCallback(() => {
    const a = document.createElement('a');
    a.href = `/api/export/report?period=${period}`;
    a.download = '';
    a.click();
  }, [period]);

  return (
    <div
      className="flex-1 overflow-y-auto p-4 lg:p-6 h-0"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.backgroundColor = 'var(--bg-subtle)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Voltar
          </button>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Analytics
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
              outline: 'none',
            }}
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {[
            {
              label: 'CSV',
              onClick: handleExportCSV,
              icon: (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              ),
            },
            {
              label: 'Relatório',
              onClick: handleExportReport,
              icon: (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              ),
            },
          ].map(({ label, onClick, icon }) => (
            <button
              key={label}
              onClick={onClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-default)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.backgroundColor = 'var(--bg-subtle)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
              }}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && !analytics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="skeleton rounded-xl h-64"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      ) : analytics ? (
        <div className="space-y-4">
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <KpiCard
              index={0}
              label="Taxa de Finalização"
              value={`${Math.round(analytics.finished_rate * 100)}%`}
              valueColor="var(--success)"
            />
            <KpiCard
              index={1}
              label="Taxa de Abandono"
              value={`${Math.round(analytics.abandoned_rate * 100)}%`}
              valueColor="var(--danger)"
            />
            <KpiCard
              index={2}
              label="1ª Resposta"
              value={formatSeconds(analytics.avg_first_response_seconds)}
              valueColor="var(--brand-500)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="Distribuição por Hora" index={0}>
              <div className="max-h-64 overflow-y-auto">
                <BarChart
                  data={analytics.hourly_distribution.map((h) => ({ label: `${h.hour}h`, value: h.count }))}
                  labelKey="label"
                  valueKey="value"
                  color="var(--brand-500)"
                />
              </div>
            </ChartCard>

            <ChartCard title="Distribuição por Dia da Semana" index={1}>
              <BarChart
                data={analytics.daily_distribution.map((d) => ({ label: d.day, value: d.count }))}
                labelKey="label"
                valueKey="value"
                color="var(--success)"
              />
            </ChartCard>

            <ChartCard title="Ranking de Tags" index={2}>
              {analytics.tag_ranking.length > 0 ? (
                <BarChart
                  data={analytics.tag_ranking.map((t) => ({ label: t.tag.slice(0, 8), value: t.count }))}
                  labelKey="label"
                  valueKey="value"
                  color="var(--warning)"
                />
              ) : (
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Nenhuma tag detectada no período
                </p>
              )}
            </ChartCard>

            <ChartCard title="Tendência (30 dias)" index={3}>
              <TrendLine data={analytics.daily_trend} />
              <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                <span>{analytics.daily_trend[0]?.date ?? ''}</span>
                <span>{analytics.daily_trend[analytics.daily_trend.length - 1]?.date ?? ''}</span>
              </div>
            </ChartCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}
