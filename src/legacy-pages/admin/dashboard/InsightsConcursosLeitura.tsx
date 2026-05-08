"use client";

import { useState } from 'react';
import { PageHeader } from '@/components/admin/dashboard/PageHeader';
import { PeriodSelector, Period } from '@/components/admin/dashboard/PeriodSelector';
import { ChartCard } from '@/components/admin/dashboard/ChartCard';
import { DataTable } from '@/components/admin/dashboard/DataTable';
import { periodToRange } from '@/components/admin/dashboard/periodHelper';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function InsightsConcursosLeitura() {
  const [period, setPeriod] = useState<Period>('month');
  const range = periodToRange(period);

  const { data: readData } = useQuery({
    queryKey: ['insights-concurso-read', period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('analytics_concurso_avg_read', {
        start_at: range.start_at ?? '1970-01-01T00:00:00Z',
        end_at: range.end_at ?? new Date().toISOString(),
      });
      if (error) throw error;
      return (data as { entity_id: string; concurso_label: string; avg_read_seconds: number; total_sessions: number }[]) ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: scrollData } = useQuery({
    queryKey: ['insights-concurso-scroll', period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('insights_concurso_scroll_stats', {
        start_at: range.start_at,
        end_at: range.end_at,
      });
      if (error) throw error;
      return (data as { entity_id: string; concurso_label: string; avg_max_scroll: number; total_sessions: number }[]) ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const readChart = readData?.slice(0, 10) ?? [];
  const scrollChart = scrollData?.slice(0, 10) ?? [];

  // Build unified table by merging read + scroll on entity_id
  const scrollMap = new Map(scrollData?.map(s => [s.entity_id, s]) ?? []);
  const tableRows = readData?.map(r => {
    const s = scrollMap.get(r.entity_id);
    return {
      title: r.concurso_label,
      avgTime: `${Math.round(r.avg_read_seconds)}s`,
      scrollDepth: s ? `${s.avg_max_scroll}%` : '—',
      views: String(r.total_sessions),
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Concursos — Leitura"
        description="Tempo de leitura e profundidade de rolagem por concurso"
        actions={<PeriodSelector value={period} onChange={setPeriod} />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Tempo médio de leitura" description={`Período: ${period}`}>
          {readChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={readChart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="concurso_label" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} unit="s" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: 12 }} />
                <Bar dataKey="avg_read_seconds" name="Tempo médio (s)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : undefined}
        </ChartCard>
        <ChartCard title="Profundidade de rolagem" description={`Período: ${period}`}>
          {scrollChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={scrollChart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="concurso_label" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: 12 }} />
                <Bar dataKey="avg_max_scroll" name="Scroll médio (%)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : undefined}
        </ChartCard>
      </div>

      <DataTable
        title="Ranking por tempo de leitura"
        columns={[
          { key: 'title', label: 'Concurso' },
          { key: 'avgTime', label: 'Tempo médio' },
          { key: 'scrollDepth', label: 'Scroll médio' },
          { key: 'views', label: 'Visualizações' },
        ]}
        rows={tableRows}
      />
    </div>
  );
}
