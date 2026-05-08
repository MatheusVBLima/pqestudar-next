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

export default function InsightsConcursosEventos() {
  const [period, setPeriod] = useState<Period>('month');
  const range = periodToRange(period);

  const { data: eventData } = useQuery({
    queryKey: ['insights-concurso-events', period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('analytics_concurso_event_counts', {
        start_at: range.start_at ?? '1970-01-01T00:00:00Z',
        end_at: range.end_at ?? new Date().toISOString(),
      });
      if (error) throw error;
      return (data as { entity_id: string; concurso_label: string; opens: number; edital_clicks: number; saves: number; shares: number }[]) ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Chart 1: Aggregate event totals
  const totals = eventData?.reduce(
    (acc, r) => ({
      opens: acc.opens + Number(r.opens),
      edital_clicks: acc.edital_clicks + Number(r.edital_clicks),
      saves: acc.saves + Number(r.saves),
      shares: acc.shares + Number(r.shares),
    }),
    { opens: 0, edital_clicks: 0, saves: 0, shares: 0 },
  );
  const eventTypeChart = totals && (totals.opens + totals.edital_clicks + totals.saves + totals.shares > 0)
    ? [
        { name: 'Aberturas', count: totals.opens },
        { name: 'Editais', count: totals.edital_clicks },
        { name: 'Salvamentos', count: totals.saves },
        { name: 'Compartilhamentos', count: totals.shares },
      ]
    : [];

  // Chart 2: Saves trend (top 10 by saves)
  const savesChart = eventData?.filter(r => r.saves > 0).sort((a, b) => Number(b.saves) - Number(a.saves)).slice(0, 10) ?? [];

  const tableRows = eventData?.map(r => ({
    title: r.concurso_label,
    saves: String(r.saves),
    shares: String(r.shares),
    editalClicks: String(r.edital_clicks),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Concursos — Eventos"
        description="Salvamentos, compartilhamentos e cliques em editais"
        actions={<PeriodSelector value={period} onChange={setPeriod} />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Eventos por tipo" description={`Período: ${period}`}>
          {eventTypeChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={eventTypeChart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: 12 }} />
                <Bar dataKey="count" name="Total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : undefined}
        </ChartCard>
        <ChartCard title="Tendência de salvamentos" description={`Período: ${period}`}>
          {savesChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={savesChart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="concurso_label" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: 12 }} />
                <Bar dataKey="saves" name="Salvamentos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : undefined}
        </ChartCard>
      </div>

      <DataTable
        title="Concursos com mais interações"
        columns={[
          { key: 'title', label: 'Concurso' },
          { key: 'saves', label: 'Salvamentos' },
          { key: 'shares', label: 'Compartilhamentos' },
          { key: 'editalClicks', label: 'Cliques edital' },
        ]}
        rows={tableRows}
      />
    </div>
  );
}
