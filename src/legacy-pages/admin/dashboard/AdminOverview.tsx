"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Wrench, BookOpen, TrendingUp, Bookmark } from "lucide-react";
import { PageHeader } from "@/components/admin/dashboard/PageHeader";
import { StatCard } from "@/components/admin/dashboard/StatCard";
import { ChartCard } from "@/components/admin/dashboard/ChartCard";
import { DataTable } from "@/components/admin/dashboard/DataTable";
import { PeriodSelector, type Period } from "@/components/admin/dashboard/PeriodSelector";
import { periodToRange } from "@/components/admin/dashboard/periodHelper";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TopPagesCard } from "@/components/admin/dashboard/TopPagesCard";
import { HorizontalBarsCard } from "@/components/admin/dashboard/HorizontalBarsCard";
import { OnlineVisitorsBadge } from "@/components/admin/dashboard/OnlineVisitorsBadge";
import { Button } from "@/components/ui/button";

const ACTIVITY_PAGE_SIZE = 10;

const PERIOD_LABELS: Record<Period, string> = {
  day: "Hoje",
  week: "Últimos 7 dias",
  month: "Últimos 30 dias",
  year: "Últimos 12 meses",
  all: "Todo histórico",
};

export default function AdminOverview() {
  const [period, setPeriod] = useState<Period>("month");
  const [activityPage, setActivityPage] = useState(1);
  const range = useMemo(() => periodToRange(period), [period]);
  const periodLabel = PERIOD_LABELS[period];

  const { data: stats } = useQuery({
    queryKey: ["admin-overview-stats", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_overview_stats", range);
      if (error) throw error;
      return data as {
        visitors_30d: number;
        tools_active: number;
        concursos_published: number;
        ctr_30d: number | null;
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: chartData } = useQuery({
    queryKey: ["admin-overview-visitors-chart", period],
    queryFn: async () => {
      const bucket = period === "day" ? "hour" : "day";
      const { data, error } = await supabase.rpc("admin_overview_visitors_chart", {
        ...range,
        p_bucket: bucket,
      });
      if (error) throw error;
      const fmt = bucket === "hour" ? "HH:mm" : "dd/MM";
      return (data as { bucket_at: string; visitors: number }[]).map((d) => ({
        day: format(new Date(d.bucket_at), fmt, { locale: ptBR }),
        visitors: Number(d.visitors),
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: activity } = useQuery({
    queryKey: ["admin-overview-activity", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_overview_activity", {
        p_limit: 100,
        ...range,
      });
      if (error) throw error;
      return (data as { event: string; entity: string; event_date: string }[]).map((row) => ({
        event: row.event,
        entity: row.entity,
        date: format(new Date(row.event_date), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: topPages, isLoading: topPagesLoading } = useQuery({
    queryKey: ["admin-overview-top-pages", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_overview_top_pages_public", {
        p_limit: 500,
        ...range,
      });
      if (error) throw error;
      return (data as { path: string; visitors: number }[]).map((d) => ({
        path: d.path,
        visitors: Number(d.visitors),
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: savedVisitors } = useQuery({
    queryKey: ["admin-overview-saved-visitors", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_overview_saved_visitors", range);
      if (error) throw error;
      const row = data?.[0];
      return {
        uniqueUsers: Number(row?.unique_users ?? 0),
        visitors: Number(row?.visitors ?? 0),
        views: Number(row?.views ?? 0),
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: sources, isLoading: sourcesLoading } = useQuery({
    queryKey: ["admin-overview-sources", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_overview_sources_public", {
        p_limit: 10,
        ...range,
      });
      if (error) throw error;
      return (data as { source: string; visitors: number }[]).map((d) => ({
        label: d.source,
        value: Number(d.visitors),
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: devices, isLoading: devicesLoading } = useQuery({
    queryKey: ["admin-overview-devices", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_overview_devices_public", range);
      if (error) throw error;
      return (data as { device: string; visitors: number }[]).map((d) => ({
        label: d.device,
        value: Number(d.visitors),
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const formatValue = (v: number | null | undefined) => (v != null ? String(v) : "—");
  const ctrDisplay = stats?.ctr_30d != null ? `${stats.ctr_30d}%` : "—";
  const activityRows = useMemo(() => activity ?? [], [activity]);
  const totalActivityPages = Math.max(1, Math.ceil(activityRows.length / ACTIVITY_PAGE_SIZE));
  const safeActivityPage = Math.min(activityPage, totalActivityPages);
  const paginatedActivityRows = useMemo(
    () => activityRows.slice((safeActivityPage - 1) * ACTIVITY_PAGE_SIZE, safeActivityPage * ACTIVITY_PAGE_SIZE),
    [activityRows, safeActivityPage],
  );
  const activityStart = activityRows.length === 0 ? 0 : (safeActivityPage - 1) * ACTIVITY_PAGE_SIZE + 1;
  const activityEnd = Math.min(safeActivityPage * ACTIVITY_PAGE_SIZE, activityRows.length);

  useEffect(() => {
    setActivityPage(1);
  }, [period]);

  useEffect(() => {
    if (activityPage > totalActivityPages) {
      setActivityPage(totalActivityPages);
    }
  }, [activityPage, totalActivityPages]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão geral"
        description="Visão geral do painel administrativo"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <OnlineVisitorsBadge />
            <PeriodSelector value={period} onChange={setPeriod} />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          title="Visitantes"
          value={formatValue(stats?.visitors_30d)}
          icon={Users}
          description={`Sessões únicas · ${periodLabel}`}
        />
        <StatCard
          title="Ferramentas ativas"
          value={formatValue(stats?.tools_active)}
          icon={Wrench}
          description="Visíveis no site"
        />
        <StatCard
          title="Concursos publicados"
          value={formatValue(stats?.concursos_published)}
          icon={BookOpen}
          description={`Publicados · ${periodLabel}`}
        />
        <StatCard
          title="Taxa de cliques"
          value={ctrDisplay}
          icon={TrendingUp}
          description={`Cliques ferramentas / visitas · ${periodLabel}`}
        />
        <StatCard
          title="Usuários em Salvos"
          value={formatValue(savedVisitors?.uniqueUsers)}
          icon={Bookmark}
          trend={savedVisitors ? `${savedVisitors.views.toLocaleString("pt-BR")} visitas` : undefined}
          description={`Usuários identificados com análise permitida · ${periodLabel}`}
        />
      </div>

      <ChartCard title="Visitantes" description={`Sessões únicas · ${periodLabel}`}>
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
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
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

      <div className="grid gap-4 lg:grid-cols-2">
        <DataTable
          title={`Atividade recente · ${periodLabel}`}
          columns={[
            { key: "event", label: "Evento" },
            { key: "entity", label: "Entidade" },
            { key: "date", label: "Data" },
          ]}
          rows={paginatedActivityRows}
          footer={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Mostrando {activityStart}-{activityEnd} de {activityRows.length} atividades
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-md text-xs"
                  disabled={safeActivityPage <= 1}
                  onClick={() => setActivityPage((page) => Math.max(1, page - 1))}
                >
                  Anterior
                </Button>
                <span className="min-w-20 text-center text-xs font-medium text-muted-foreground">
                  Página {safeActivityPage} de {totalActivityPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-md text-xs"
                  disabled={safeActivityPage >= totalActivityPages}
                  onClick={() => setActivityPage((page) => Math.min(totalActivityPages, page + 1))}
                >
                  Próxima
                </Button>
              </div>
            </div>
          }
        />
        <TopPagesCard data={topPages} loading={topPagesLoading} periodLabel={periodLabel} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <HorizontalBarsCard
          title="Origem do tráfego"
          description={`Top 10 · ${periodLabel}`}
          data={sources}
          loading={sourcesLoading}
        />
        <HorizontalBarsCard
          title="Dispositivos"
          description={`Visitantes únicos · ${periodLabel}`}
          data={devices}
          loading={devicesLoading}
          showPercent
        />
      </div>
    </div>
  );
}
