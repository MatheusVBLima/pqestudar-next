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

export default function InsightsFerramentas() {
  const [period, setPeriod] = useState<Period>('month');
  const range = periodToRange(period);

  const { data: ranking } = useQuery({
    queryKey: ['insights-tools-ranking', period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('insights_tools_ranking', {
        start_at: range.start_at,
        end_at: range.end_at,
      });
      if (error) throw error;
      return (data as { tool_id: string; tool_name: string; clicks: number; outbound: number; saves: number }[]) ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const clicksChart = ranking?.filter(r => r.clicks > 0 || r.outbound > 0).slice(0, 10) ?? [];
  const savesChart = ranking?.filter(r => r.saves > 0).slice(0, 10) ?? [];

  const tableRows = ranking?.map(r => ({
    name: r.tool_name,
    clicks: String(r.clicks),
    saves: r.saves > 0 ? String(r.saves) : '—',
    outbound: String(r.outbound),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ferramentas"
        description="Métricas de uso e engajamento das ferramentas"
        actions={<PeriodSelector value={period} onChange={setPeriod} />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Cliques por ferramenta" description={`Período: ${period}`}>
          {clicksChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={clicksChart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="tool_name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: 12 }} />
                <Bar dataKey="clicks" name="Card clicks" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outbound" name="Outbound" fill="hsl(var(--primary) / 0.5)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : undefined}
        </ChartCard>
        <ChartCard title="Ferramentas mais salvas" description={`Período: ${period}`}>
          {savesChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={savesChart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="tool_name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: 12 }} />
                <Bar dataKey="saves" name="Salvamentos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : undefined}
        </ChartCard>
      </div>

      <DataTable
        title="Ranking de ferramentas"
        columns={[
          { key: 'name', label: 'Ferramenta' },
          { key: 'clicks', label: 'Cliques' },
          { key: 'saves', label: 'Salvamentos' },
          { key: 'outbound', label: 'Cliques outbound' },
        ]}
        rows={tableRows}
      />
    </div>
  );
}
