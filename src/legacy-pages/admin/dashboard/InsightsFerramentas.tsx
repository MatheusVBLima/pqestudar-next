"use client";

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/admin/dashboard/PageHeader';
import { PeriodSelector, Period } from '@/components/admin/dashboard/PeriodSelector';
import { ChartCard } from '@/components/admin/dashboard/ChartCard';
import { DataTable } from '@/components/admin/dashboard/DataTable';
import { periodToRange } from '@/components/admin/dashboard/periodHelper';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';

const RANKING_PAGE_SIZE = 10;

export default function InsightsFerramentas() {
  const [period, setPeriod] = useState<Period>('month');
  const [rankingPage, setRankingPage] = useState(1);
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
  })) ?? [];

  const totalRankingPages = Math.max(1, Math.ceil(tableRows.length / RANKING_PAGE_SIZE));
  const safeRankingPage = Math.min(rankingPage, totalRankingPages);
  const paginatedRows = useMemo(
    () => tableRows.slice((safeRankingPage - 1) * RANKING_PAGE_SIZE, safeRankingPage * RANKING_PAGE_SIZE),
    [safeRankingPage, tableRows]
  );
  const rankingStart = tableRows.length === 0 ? 0 : (safeRankingPage - 1) * RANKING_PAGE_SIZE + 1;
  const rankingEnd = Math.min(safeRankingPage * RANKING_PAGE_SIZE, tableRows.length);

  useEffect(() => {
    setRankingPage(1);
  }, [period]);

  useEffect(() => {
    if (rankingPage > totalRankingPages) {
      setRankingPage(totalRankingPages);
    }
  }, [rankingPage, totalRankingPages]);

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
                <Bar dataKey="outbound" name="Cliques no site" fill="hsl(var(--primary) / 0.5)" radius={[4, 4, 0, 0]} />
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
          {
            key: 'name',
            label: 'Ferramenta',
            className: 'w-[360px] min-w-[360px] max-w-[360px] truncate',
          },
          {
            key: 'clicks',
            label: 'Cliques',
            className: 'w-[140px] min-w-[140px] max-w-[140px]',
          },
          {
            key: 'saves',
            label: 'Salvamentos',
            className: 'w-[180px] min-w-[180px] max-w-[180px]',
          },
          {
            key: 'outbound',
            label: 'Cliques no site',
            className: 'w-[220px] min-w-[220px] max-w-[220px]',
          },
        ]}
        rows={paginatedRows}
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Mostrando {rankingStart}-{rankingEnd} de {tableRows.length} ferramentas
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-md text-xs"
                disabled={safeRankingPage <= 1}
                onClick={() => setRankingPage((page) => Math.max(1, page - 1))}
              >
                Anterior
              </Button>
              <span className="min-w-20 text-center text-xs font-medium text-muted-foreground">
                Página {safeRankingPage} de {totalRankingPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-md text-xs"
                disabled={safeRankingPage >= totalRankingPages}
                onClick={() => setRankingPage((page) => Math.min(totalRankingPages, page + 1))}
              >
                Próxima
              </Button>
            </div>
          </div>
        }
      />
    </div>
  );
}
