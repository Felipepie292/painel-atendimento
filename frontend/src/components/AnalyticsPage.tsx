import { useState, useEffect, useCallback } from 'react';
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
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[11px] dark:text-zinc-400 text-zinc-500 w-8 text-right shrink-0">
            {item[labelKey]}
          </span>
          <div className="flex-1 h-5 dark:bg-zinc-800 bg-zinc-100 rounded overflow-hidden">
            <div
              className={`h-full ${color} rounded transition-all duration-500`}
              style={{ width: `${((item[valueKey] as number) / maxVal) * 100}%` }}
            />
          </div>
          <span className="text-[11px] dark:text-zinc-400 text-zinc-500 w-8 shrink-0">
            {item[valueKey]}
          </span>
        </div>
      ))}
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
      <polygon points={areaPoints} className="dark:fill-indigo-500/10 fill-indigo-500/15" />
      <polyline
        points={points}
        fill="none"
        className="dark:stroke-indigo-400 stroke-indigo-500"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AnalyticsPage({ onBack }: { onBack: () => void }) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [period, setPeriod] = useState('30days');
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${period}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setAnalytics(await res.json());
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [period]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExportCSV = useCallback(() => {
    const url = `/api/export/csv?period=${period}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    a.click();
  }, [period]);

  const handleExportReport = useCallback(() => {
    const url = `/api/export/report?period=${period}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    a.click();
  }, [period]);

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 dark:bg-zinc-900 bg-gray-50 h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700
              bg-gray-100 text-zinc-700 hover:bg-gray-200
              transition-colors duration-150"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Voltar
          </button>
          <h2 className="text-lg font-bold dark:text-zinc-100 text-zinc-900">
            Analytics
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border
              dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300
              bg-white border-zinc-300 text-zinc-700
              focus:outline-none focus:ring-2 focus:ring-indigo-500/40
              transition-colors duration-200 cursor-pointer"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700
              bg-gray-100 text-zinc-700 hover:bg-gray-200
              transition-colors duration-150"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            CSV
          </button>
          <button
            onClick={handleExportReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700
              bg-gray-100 text-zinc-700 hover:bg-gray-200
              transition-colors duration-150"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Relatório
          </button>
        </div>
      </div>

      {loading && !analytics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border dark:border-zinc-800 dark:bg-zinc-800/30 bg-white border-zinc-200 p-5 h-64 animate-pulse">
              <div className="h-4 w-24 dark:bg-zinc-700 bg-zinc-200 rounded mb-4" />
              <div className="h-40 dark:bg-zinc-700/50 bg-zinc-100 rounded" />
            </div>
          ))}
        </div>
      ) : analytics ? (
        <div className="space-y-4">
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="rounded-xl border dark:border-zinc-800 dark:bg-zinc-800/30 bg-white border-zinc-200 p-4">
              <div className="text-xs dark:text-zinc-500 text-zinc-400 mb-1">Taxa de Finalização</div>
              <div className="text-2xl font-bold dark:text-emerald-400 text-emerald-600">
                {Math.round(analytics.finished_rate * 100)}%
              </div>
            </div>
            <div className="rounded-xl border dark:border-zinc-800 dark:bg-zinc-800/30 bg-white border-zinc-200 p-4">
              <div className="text-xs dark:text-zinc-500 text-zinc-400 mb-1">Taxa de Abandono</div>
              <div className="text-2xl font-bold dark:text-red-400 text-red-600">
                {Math.round(analytics.abandoned_rate * 100)}%
              </div>
            </div>
            <div className="rounded-xl border dark:border-zinc-800 dark:bg-zinc-800/30 bg-white border-zinc-200 p-4">
              <div className="text-xs dark:text-zinc-500 text-zinc-400 mb-1">Tempo Médio 1a Resposta</div>
              <div className="text-2xl font-bold dark:text-indigo-400 text-indigo-600">
                {formatSeconds(analytics.avg_first_response_seconds)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Hourly distribution */}
            <div className="rounded-xl border dark:border-zinc-800 dark:bg-zinc-800/30 bg-white border-zinc-200 p-5">
              <h3 className="text-sm font-semibold dark:text-zinc-100 text-zinc-900 mb-4">
                Distribuição por Hora
              </h3>
              <div className="max-h-64 overflow-y-auto">
                <BarChart
                  data={analytics.hourly_distribution.map((h) => ({ label: `${h.hour}h`, value: h.count }))}
                  labelKey="label"
                  valueKey="value"
                  color="dark:bg-indigo-500 bg-indigo-500"
                />
              </div>
            </div>

            {/* Daily distribution */}
            <div className="rounded-xl border dark:border-zinc-800 dark:bg-zinc-800/30 bg-white border-zinc-200 p-5">
              <h3 className="text-sm font-semibold dark:text-zinc-100 text-zinc-900 mb-4">
                Distribuição por Dia da Semana
              </h3>
              <BarChart
                data={analytics.daily_distribution.map((d) => ({ label: d.day, value: d.count }))}
                labelKey="label"
                valueKey="value"
                color="dark:bg-emerald-500 bg-emerald-500"
              />
            </div>

            {/* Tag ranking */}
            <div className="rounded-xl border dark:border-zinc-800 dark:bg-zinc-800/30 bg-white border-zinc-200 p-5">
              <h3 className="text-sm font-semibold dark:text-zinc-100 text-zinc-900 mb-4">
                Ranking de Tags
              </h3>
              {analytics.tag_ranking.length > 0 ? (
                <BarChart
                  data={analytics.tag_ranking.map((t) => ({ label: t.tag.slice(0, 8), value: t.count }))}
                  labelKey="label"
                  valueKey="value"
                  color="dark:bg-amber-500 bg-amber-500"
                />
              ) : (
                <p className="text-xs dark:text-zinc-500 text-zinc-400">
                  Nenhuma tag detectada no período
                </p>
              )}
            </div>

            {/* Trend line */}
            <div className="rounded-xl border dark:border-zinc-800 dark:bg-zinc-800/30 bg-white border-zinc-200 p-5">
              <h3 className="text-sm font-semibold dark:text-zinc-100 text-zinc-900 mb-4">
                Tendência (30 dias)
              </h3>
              <TrendLine data={analytics.daily_trend} />
              <div className="flex justify-between text-[10px] dark:text-zinc-600 text-zinc-400 mt-1">
                <span>{analytics.daily_trend[0]?.date ?? ''}</span>
                <span>{analytics.daily_trend[analytics.daily_trend.length - 1]?.date ?? ''}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
