"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, BookOpen, Clock3, ExternalLink, Eye, Search, SlidersHorizontal, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/admin/dashboard/PageHeader";
import { PeriodSelector, type Period } from "@/components/admin/dashboard/PeriodSelector";
import { periodToRange } from "@/components/admin/dashboard/periodHelper";
import { StatCard } from "@/components/admin/dashboard/StatCard";
import { ChartCard } from "@/components/admin/dashboard/ChartCard";
import { DataTable } from "@/components/admin/dashboard/DataTable";
import { supabase } from "@/integrations/supabase/client";

type CourseRow = {
  course_id: string;
  title: string;
  slug: string;
  status: string;
  card_opens: number;
  detail_opens: number;
  visitors: number;
  external_clicks: number;
  save_clicks: number;
  avg_read_seconds: number;
  avg_max_scroll: number;
};

type DashboardData = {
  overview: {
    catalog_views: number;
    catalog_visitors: number;
    authenticated_visitors: number;
    searches: number;
    filter_uses: number;
    detail_opens: number;
    external_clicks: number;
    avg_read_seconds: number;
    history_start: string | null;
  };
  timeline: Array<{ day: string; catalog_views: number; detail_opens: number; external_clicks: number }>;
  courses: CourseRow[];
};

const EMPTY: DashboardData = {
  overview: { catalog_views: 0, catalog_visitors: 0, authenticated_visitors: 0, searches: 0, filter_uses: 0, detail_opens: 0, external_clicks: 0, avg_read_seconds: 0, history_start: null },
  timeline: [],
  courses: [],
};

export default function InsightsPremiumCursos() {
  const [period, setPeriod] = useState<Period>("month");
  const range = periodToRange(period);
  const { data = EMPTY, isLoading, error } = useQuery({
    queryKey: ["insights-premium-cursos", period],
    queryFn: async () => {
      const { data: result, error: rpcError } = await supabase.rpc("analytics_premium_courses_dashboard", {
        start_at: range.start_at,
        end_at: range.end_at,
      });
      if (rpcError) throw rpcError;
      return (result ?? EMPTY) as unknown as DashboardData;
    },
    staleTime: 5 * 60 * 1000,
  });

  const ranking = useMemo(() => data.courses.slice(0, 10), [data.courses]);
  const conversion = data.overview.detail_opens > 0
    ? `${((data.overview.external_clicks / data.overview.detail_opens) * 100).toFixed(1)}%`
    : "0%";
  const rows = data.courses.map((course) => ({
    curso: course.title,
    status: course.status === "published" ? "Publicado" : "Rascunho",
    cards: String(course.card_opens),
    detalhes: String(course.detail_opens),
    visitantes: String(course.visitors),
    saidas: String(course.external_clicks),
    leitura: course.avg_read_seconds ? `${Math.round(course.avg_read_seconds)}s` : "—",
    scroll: course.avg_max_scroll ? `${Math.round(course.avg_max_scroll)}%` : "—",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cursos premium"
        description="Acompanhe descoberta, leitura e conversão dos cursos disponíveis na área premium."
        actions={<PeriodSelector value={period} onChange={setPeriod} />}
      />

      {error && (
        <div className="rounded-[1.2rem] border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-semibold">Não foi possível carregar as métricas de cursos premium.</p>
          <p className="mt-1 text-xs opacity-90">{error instanceof Error ? error.message : "Confirme se a migração foi aplicada no Supabase."}</p>
        </div>
      )}

      {!error && data.overview.history_start && (
        <div className="rounded-[1.2rem] border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          Visitas e aberturas incluem o histórico disponível desde {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" }).format(new Date(data.overview.history_start))}. Acessos administrativos foram excluídos. Busca, filtros, leitura, scroll e saídas externas são contabilizados a partir da instrumentação detalhada.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Visitas" value={isLoading ? "—" : String(data.overview.catalog_views)} icon={Eye} />
        <StatCard title="Sessões" value={isLoading ? "—" : String(data.overview.catalog_visitors)} icon={Users} />
        <StatCard title="Usuários autenticados" value={isLoading ? "—" : String(data.overview.authenticated_visitors)} icon={Users} />
        <StatCard title="Buscas" value={isLoading ? "—" : String(data.overview.searches)} icon={Search} />
        <StatCard title="Uso de filtros" value={isLoading ? "—" : String(data.overview.filter_uses)} icon={SlidersHorizontal} />
        <StatCard title="Cursos abertos" value={isLoading ? "—" : String(data.overview.detail_opens)} icon={BookOpen} />
        <StatCard title="Acessos externos" value={isLoading ? "—" : String(data.overview.external_clicks)} icon={ExternalLink} />
        <StatCard title="Conversão" value={isLoading ? "—" : conversion} icon={BarChart3} />
        <StatCard title="Leitura média" value={isLoading ? "—" : data.overview.avg_read_seconds ? `${Math.round(data.overview.avg_read_seconds)}s` : "0s"} icon={Clock3} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Comportamento ao longo do período" description="Vitrine, detalhes e acessos à plataforma oficial por dia">
          {data.timeline.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.timeline} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Line type="monotone" dataKey="catalog_views" name="Vitrine" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="detail_opens" name="Detalhes" stroke="hsl(160 84% 39%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="external_clicks" name="Acessos externos" stroke="hsl(38 92% 50%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : undefined}
        </ChartCard>

        <ChartCard title="Cursos mais acessados" description="Cursos novos entram automaticamente neste ranking">
          {ranking.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ranking} layout="vertical" margin={{ top: 5, right: 12, left: 24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="title" width={125} tick={{ fontSize: 10 }} tickFormatter={(value: string) => value.length > 20 ? `${value.slice(0, 20)}…` : value} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Bar dataKey="detail_opens" name="Detalhes" fill="hsl(var(--primary))" radius={[0, 5, 5, 0]} />
                <Bar dataKey="external_clicks" name="Acessos externos" fill="hsl(var(--primary) / 0.42)" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : undefined}
        </ChartCard>
      </div>

      <DataTable
        title="Desempenho por curso"
        columns={[
          { key: "curso", label: "Curso", className: "min-w-[260px]" },
          { key: "status", label: "Status" },
          { key: "cards", label: "Cards" },
          { key: "detalhes", label: "Detalhes" },
          { key: "visitantes", label: "Visitantes" },
          { key: "saidas", label: "Acessos externos" },
          { key: "leitura", label: "Leitura média" },
          { key: "scroll", label: "Scroll médio" },
        ]}
        rows={rows}
      />
    </div>
  );
}
