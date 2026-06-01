"use client";

import { useState } from "react";
import { PageHeader } from "@/components/admin/dashboard/PageHeader";
import { PeriodSelector, type Period } from "@/components/admin/dashboard/PeriodSelector";
import { StatCard } from "@/components/admin/dashboard/StatCard";
import { ChartCard } from "@/components/admin/dashboard/ChartCard";
import { DataTable } from "@/components/admin/dashboard/DataTable";
import { HorizontalBarsCard } from "@/components/admin/dashboard/HorizontalBarsCard";
import { periodToRange } from "@/components/admin/dashboard/periodHelper";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BookOpen, Eye, Clock, MousePointerClick, Target } from "lucide-react";

interface GuideRankingRow {
  entity_id?: string;
  guide_label: string;
  slug?: string;
  views: number;
  opens: number;
  cta_clicks: number;
  internal_link_clicks: number;
  avg_read_seconds?: number;
  avg_max_scroll?: number;
}

interface ScrollStatRow {
  guide_label: string;
  avg_max_scroll: number;
}

interface AvgReadRow {
  guide_label: string;
  avg_read_seconds: number;
}

interface CtaRow {
  cta_label: string;
  cta_position: string;
  guide_label: string;
  cta_url: string;
  clicks: number;
}

interface InternalLinkRow {
  link_label: string;
  guide_label: string;
  link_url: string;
  clicks: number;
}

interface SourceRow {
  source: string;
  visitors: number;
}

interface OverviewRow {
  total_views?: number;
  unique_guides?: number;
  avg_read_seconds?: number;
  avg_completion_pct?: number;
  cta_clicks?: number;
  cta_ctr?: number;
}

export default function InsightsGuias() {
  const [period, setPeriod] = useState<Period>("month");
  const range = periodToRange(period);
  const args = { start_at: range.start_at, end_at: range.end_at };

  const overview = useQuery({
    queryKey: ["insights-guides-overview", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_guides_overview", args);
      if (error) throw error;
      return data as OverviewRow;
    },
    staleTime: 5 * 60 * 1000,
  });

  const ranking = useQuery({
    queryKey: ["insights-guides-ranking", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_guides_ranking", args);
      if (error) throw error;
      return (data as GuideRankingRow[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const scroll = useQuery({
    queryKey: ["insights-guides-scroll", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_guide_scroll_stats", args);
      if (error) throw error;
      return (data as ScrollStatRow[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const read = useQuery({
    queryKey: ["insights-guides-read", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_guide_avg_read", args);
      if (error) throw error;
      return (data as AvgReadRow[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const ctas = useQuery({
    queryKey: ["insights-guides-ctas", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_guide_top_ctas", args);
      if (error) throw error;
      return (data as CtaRow[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const links = useQuery({
    queryKey: ["insights-guides-links", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_guide_top_internal_links", args);
      if (error) throw error;
      return (data as InternalLinkRow[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const sources = useQuery({
    queryKey: ["insights-guides-sources", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_guide_sources", args);
      if (error) throw error;
      return (data as SourceRow[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const ov = overview.data ?? {};
  const fmtSec = (s: number) => {
    if (!s) return "0s";
    if (s < 60) return `${Math.round(s)}s`;
    return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
  };

  const rankingChart = (ranking.data ?? [])
    .map((r) => ({
      label: (r.guide_label || "").slice(0, 24),
      views: Number(r.views ?? 0),
      cta: Number(r.cta_clicks ?? 0),
    }))
    .filter((r) => r.views > 0 || r.cta > 0)
    .slice(0, 10);

  const scrollChartFromStats = (scroll.data ?? [])
    .map((r) => ({
      guide_label: r.guide_label,
      avg_max_scroll: Number(r.avg_max_scroll ?? 0),
    }))
    .filter((r) => r.avg_max_scroll > 0)
    .slice(0, 10);

  const scrollChartFromRanking = (ranking.data ?? [])
    .map((r) => ({
      guide_label: r.guide_label,
      avg_max_scroll: Number(r.avg_max_scroll ?? 0),
    }))
    .filter((r) => r.avg_max_scroll > 0)
    .slice(0, 10);

  const readChartFromStats = (read.data ?? [])
    .map((r) => ({
      guide_label: r.guide_label,
      avg_read_seconds: Number(r.avg_read_seconds ?? 0),
    }))
    .filter((r) => r.avg_read_seconds > 0)
    .slice(0, 10);

  const readChartFromRanking = (ranking.data ?? [])
    .map((r) => ({
      guide_label: r.guide_label,
      avg_read_seconds: Number(r.avg_read_seconds ?? 0),
    }))
    .filter((r) => r.avg_read_seconds > 0)
    .slice(0, 10);

  const scrollChart = scrollChartFromStats.length > 0 ? scrollChartFromStats : scrollChartFromRanking;
  const readChart = readChartFromStats.length > 0 ? readChartFromStats : readChartFromRanking;
  const hasOverviewViews = Number(ov.total_views ?? 0) > 0;
  const detailedAnalyticsMessage = hasOverviewViews
    ? "Há visualizações registradas no contador simples, mas ainda não há eventos detalhados de analytics para montar este ranking."
    : "Sem dados detalhados no período.";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guias — Leitura"
        description="Performance editorial: acessos, leitura, retenção e cliques"
        actions={<PeriodSelector value={period} onChange={setPeriod} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Visualizações"
          value={Number(ov.total_views ?? 0).toLocaleString("pt-BR")}
          icon={Eye}
        />
        <StatCard title="Guias únicos" value={String(ov.unique_guides ?? 0)} icon={BookOpen} />
        <StatCard
          title="Tempo médio"
          value={fmtSec(Number(ov.avg_read_seconds ?? 0))}
          icon={Clock}
        />
        <StatCard
          title="Conclusão"
          value={`${Number(ov.avg_completion_pct ?? 0)}%`}
          description="≥75% de scroll"
          icon={Target}
        />
        <StatCard
          title="CTR de CTA"
          value={ov.cta_ctr != null ? `${ov.cta_ctr}%` : "—"}
          description={`${Number(ov.cta_clicks ?? 0)} cliques`}
          icon={MousePointerClick}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Ranking de guias" description="Top 10 por visualizações">
          {rankingChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={rankingChart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={70} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="views" name="Views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cta" name="Cliques CTA" fill="hsl(var(--primary) / 0.4)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center px-6 text-center text-sm text-muted-foreground">
              {detailedAnalyticsMessage}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Profundidade de rolagem" description="Scroll médio (%) por guia — Top 10">
          {scrollChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={scrollChart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="guide_label"
                  tick={{ fontSize: 10 }}
                  angle={-20}
                  textAnchor="end"
                  height={70}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="avg_max_scroll"
                  name="Scroll médio (%)"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center px-6 text-center text-sm text-muted-foreground">
              {detailedAnalyticsMessage}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Tempo médio de leitura" description="Top 10 por segundos">
          {readChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={readChart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="guide_label"
                  tick={{ fontSize: 10 }}
                  angle={-20}
                  textAnchor="end"
                  height={70}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} unit="s" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="avg_read_seconds"
                  name="Tempo (s)"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center px-6 text-center text-sm text-muted-foreground">
              {detailedAnalyticsMessage}
            </div>
          )}
        </ChartCard>

        <HorizontalBarsCard
          title="Origem do tráfego"
          description="Visitantes por fonte nas páginas de guias"
          loading={sources.isLoading}
          showPercent
          data={(sources.data ?? []).map((s) => ({
            label: s.source,
            value: Number(s.visitors),
          }))}
        />
      </div>

      <DataTable
        title="Cliques por guia"
        columns={[
          { key: "title", label: "Guia" },
          { key: "views", label: "Views" },
          { key: "opens", label: "Aberturas" },
          { key: "cta_clicks", label: "Cliques CTA" },
          { key: "internal_link_clicks", label: "Links internos" },
        ]}
        rows={(ranking.data ?? []).map((r) => ({
          title: r.guide_label,
          views: String(r.views),
          opens: String(r.opens),
          cta_clicks: String(r.cta_clicks),
          internal_link_clicks: String(r.internal_link_clicks),
        }))}
        emptyMessage={detailedAnalyticsMessage}
      />

      <DataTable
        title="CTAs mais clicadas"
        columns={[
          { key: "cta_label", label: "CTA" },
          { key: "cta_position", label: "Posição" },
          { key: "guide_label", label: "Guia" },
          { key: "cta_url", label: "Link" },
          { key: "clicks", label: "Cliques" },
        ]}
        rows={(ctas.data ?? []).map((r) => ({
          cta_label: r.cta_label,
          cta_position: r.cta_position,
          guide_label: r.guide_label,
          cta_url: r.cta_url,
          clicks: String(r.clicks),
        }))}
      />

      <DataTable
        title="Links internos mais clicados"
        columns={[
          { key: "link_label", label: "Link" },
          { key: "guide_label", label: "Guia de origem" },
          { key: "link_url", label: "Destino" },
          { key: "clicks", label: "Cliques" },
        ]}
        rows={(links.data ?? []).map((r) => ({
          link_label: r.link_label,
          guide_label: r.guide_label,
          link_url: r.link_url,
          clicks: String(r.clicks),
        }))}
      />
    </div>
  );
}
