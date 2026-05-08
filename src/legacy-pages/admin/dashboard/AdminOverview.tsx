"use client";

import { Users, Wrench, BookOpen, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/admin/dashboard/PageHeader';
import { StatCard } from '@/components/admin/dashboard/StatCard';
import { ChartCard } from '@/components/admin/dashboard/ChartCard';
import { DataTable } from '@/components/admin/dashboard/DataTable';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function AdminOverview() {
  // Stats cards
  const { data: stats } = useQuery({
    queryKey: ['admin-overview-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_overview_stats');
      if (error) throw error;
      return data as {
        visitors_30d: number;
        tools_active: number;
        concursos_published: number;
        ctr_30d: number | null;
      };
    },
    staleTime: 10 * 60 * 1000,
  });

  // Visitors chart
  const { data: chartData } = useQuery({
    queryKey: ['admin-overview-visitors-chart'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_overview_visitors_chart');
      if (error) throw error;
      return (data as { day: string; visitors: number }[]).map((d) => ({
        day: format(new Date(d.day), 'dd/MM', { locale: ptBR }),
        visitors: Number(d.visitors),
      }));
    },
    staleTime: 10 * 60 * 1000,
  });

  // Activity feed
  const { data: activity } = useQuery({
    queryKey: ['admin-overview-activity'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_overview_activity', { p_limit: 20 });
      if (error) throw error;
      return (data as { event: string; entity: string; event_date: string }[]).map((row) => ({
        event: row.event,
        entity: row.entity,
        date: format(new Date(row.event_date), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      }));
    },
    staleTime: 10 * 60 * 1000,
  });

  const formatValue = (v: number | null | undefined) => (v != null ? String(v) : '—');
  const ctrDisplay = stats?.ctr_30d != null ? `${stats.ctr_30d}%` : '—';

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description="Visão geral do painel administrativo" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Visitantes (30d)" value={formatValue(stats?.visitors_30d)} icon={Users} description="Sessões únicas" />
        <StatCard title="Ferramentas ativas" value={formatValue(stats?.tools_active)} icon={Wrench} description="Visíveis no site" />
        <StatCard title="Concursos publicados" value={formatValue(stats?.concursos_published)} icon={BookOpen} description="Total publicado" />
        <StatCard title="Taxa de cliques" value={ctrDisplay} icon={TrendingUp} description="Cliques ferramentas / visitas (30d)" />
      </div>

      <ChartCard title="Visitantes" description="Sessões únicas nos últimos 30 dias">
        {chartData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="visitors"
                stroke="hsl(var(--primary))"
                fill="url(#colorVisitors)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : undefined}
      </ChartCard>

      <DataTable
        title="Atividade recente"
        columns={[
          { key: 'event', label: 'Evento' },
          { key: 'entity', label: 'Entidade' },
          { key: 'date', label: 'Data' },
        ]}
        rows={activity}
      />
    </div>
  );
}
