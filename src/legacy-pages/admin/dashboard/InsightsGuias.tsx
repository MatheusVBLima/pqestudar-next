"use client";

import { useState } from "react";
import { PageHeader } from "@/components/admin/dashboard/PageHeader";
import { PeriodSelector, type Period } from "@/components/admin/dashboard/PeriodSelector";
import { StatCard } from "@/components/admin/dashboard/StatCard";
import { ChartCard } from "@/components/admin/dashboard/ChartCard";
import { DataTable } from "@/components/admin/dashboard/DataTable";
import { HorizontalBarsCard } from "@/components/admin/dashboard/HorizontalBarsCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const PAGE_SIZE = 5;

type PageKey = "sources" | "guideClicks" | "ctas" | "links";
type PageState = Record<PageKey, number>;
type ChartKey = "ranking" | "scroll" | "read";
type ChartLimit = "10" | "20" | "50" | "all";
type ChartLimitState = Record<ChartKey, ChartLimit>;

const INITIAL_PAGES: PageState = {
  sources: 1,
  guideClicks: 1,
  ctas: 1,
  links: 1,
};

const INITIAL_CHART_LIMITS: ChartLimitState = {
  ranking: "10",
  scroll: "10",
  read: "10",
};

function paginate<T>(items: T[], requestedPage: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.min(Math.max(requestedPage, 1), totalPages);
  return {
    items: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    page,
    totalPages,
  };
}

function limitChartItems<T>(items: T[], limit: ChartLimit) {
  return limit === "all" ? items : items.slice(0, Number(limit));
}

function ChartLimitSelect({ value, onChange }: { value: ChartLimit; onChange: (value: ChartLimit) => void }) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as ChartLimit)}>
      <SelectTrigger className="h-8 w-[110px] text-xs">
        <SelectValue aria-label="Quantidade exibida" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="10">10 itens</SelectItem>
        <SelectItem value="20">20 itens</SelectItem>
        <SelectItem value="50">50 itens</SelectItem>
        <SelectItem value="all">Todos</SelectItem>
      </SelectContent>
    </Select>
  );
}

function PaginationControls({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 rounded-md text-xs"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Anterior
      </Button>
      <span className="min-w-20 text-center text-xs font-medium text-muted-foreground">
        Página {page} de {totalPages}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 rounded-md text-xs"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Próxima
      </Button>
    </div>
  );
}

export default function InsightsGuias() {
  const [period, setPeriod] = useState<Period>("month");
  const [pages, setPages] = useState<PageState>(INITIAL_PAGES);
  const [chartLimits, setChartLimits] = useState<ChartLimitState>(INITIAL_CHART_LIMITS);
  const setPage = (key: PageKey, page: number) => {
    setPages((current) => ({ ...current, [key]: page }));
  };
  const changePeriod = (nextPeriod: Period) => {
    setPeriod(nextPeriod);
    setPages(INITIAL_PAGES);
  };
  const setChartLimit = (key: ChartKey, limit: ChartLimit) => {
    setChartLimits((current) => ({ ...current, [key]: limit }));
  };
  const range = periodToRange(period);
  const args = { start_at: range.start_at, end_at: range.end_at };

  const overview = useQuery({
    queryKey: ["insights-guides-overview", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_guides_overview_public", args);
      if (error) throw error;
      return data as OverviewRow;
    },
    staleTime: 5 * 60 * 1000,
  });

  const ranking = useQuery({
    queryKey: ["insights-guides-ranking", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_guides_ranking_public", args);
      if (error) throw error;
      return (data as GuideRankingRow[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const scroll = useQuery({
    queryKey: ["insights-guides-scroll", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_guide_scroll_stats_public", args);
      if (error) throw error;
      return (data as ScrollStatRow[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const read = useQuery({
    queryKey: ["insights-guides-read", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_guide_avg_read_public", args);
      if (error) throw error;
      return (data as AvgReadRow[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const ctas = useQuery({
    queryKey: ["insights-guides-ctas", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_guide_top_ctas_public", args);
      if (error) throw error;
      return (data as CtaRow[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const links = useQuery({
    queryKey: ["insights-guides-links", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_guide_top_internal_links_public", args);
      if (error) throw error;
      return (data as InternalLinkRow[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const sources = useQuery({
    queryKey: ["insights-guides-sources", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_guide_sources_public", args);
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
    .filter((r) => r.views > 0 || r.cta > 0);

  const scrollChartFromStats = (scroll.data ?? [])
    .map((r) => ({
      guide_label: r.guide_label,
      avg_max_scroll: Number(r.avg_max_scroll ?? 0),
    }))
    .filter((r) => r.avg_max_scroll > 0);

  const scrollChartFromRanking = (ranking.data ?? [])
    .map((r) => ({
      guide_label: r.guide_label,
      avg_max_scroll: Number(r.avg_max_scroll ?? 0),
    }))
    .filter((r) => r.avg_max_scroll > 0);

  const readChartFromStats = (read.data ?? [])
    .map((r) => ({
      guide_label: r.guide_label,
      avg_read_seconds: Number(r.avg_read_seconds ?? 0),
    }))
    .filter((r) => r.avg_read_seconds > 0);

  const readChartFromRanking = (ranking.data ?? [])
    .map((r) => ({
      guide_label: r.guide_label,
      avg_read_seconds: Number(r.avg_read_seconds ?? 0),
    }))
    .filter((r) => r.avg_read_seconds > 0);

  const scrollChart = scrollChartFromStats.length > 0 ? scrollChartFromStats : scrollChartFromRanking;
  const readChart = readChartFromStats.length > 0 ? readChartFromStats : readChartFromRanking;
  const sourceRows = (sources.data ?? []).map((source) => ({
    label: source.source,
    value: Number(source.visitors),
  }));
  const guideClickRows = (ranking.data ?? []).map((row) => ({
    title: row.guide_label,
    views: String(row.views),
    opens: String(row.opens),
    cta_clicks: String(row.cta_clicks),
    internal_link_clicks: String(row.internal_link_clicks),
  }));
  const ctaRows = (ctas.data ?? []).map((row) => ({
    cta_label: row.cta_label,
    cta_position: row.cta_position,
    guide_label: row.guide_label,
    cta_url: row.cta_url,
    clicks: String(row.clicks),
  }));
  const linkRows = (links.data ?? []).map((row) => ({
    link_label: row.link_label,
    guide_label: row.guide_label,
    link_url: row.link_url,
    clicks: String(row.clicks),
  }));

  const rankingDisplay = limitChartItems(rankingChart, chartLimits.ranking);
  const scrollDisplay = limitChartItems(scrollChart, chartLimits.scroll);
  const readDisplay = limitChartItems(readChart, chartLimits.read);
  const sourcesPage = paginate(sourceRows, pages.sources);
  const guideClicksPage = paginate(guideClickRows, pages.guideClicks);
  const ctasPage = paginate(ctaRows, pages.ctas);
  const linksPage = paginate(linkRows, pages.links);
  const sourceTotal = sourceRows.reduce((total, row) => total + row.value, 0);
  const sourceMax = sourceRows.length > 0 ? Math.max(...sourceRows.map((row) => row.value)) : 0;
  const hasOverviewViews = Number(ov.total_views ?? 0) > 0;
  const detailedAnalyticsMessage = hasOverviewViews
    ? "Há visualizações registradas no contador simples, mas ainda não há eventos detalhados de analytics para montar este ranking."
    : "Sem dados detalhados no período.";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guias — Leitura"
        description="Performance editorial: acessos, leitura, retenção e cliques"
        actions={<PeriodSelector value={period} onChange={changePeriod} />}
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
        <ChartCard
          title="Ranking de guias"
          description="Ordenado por visualizações"
          actions={<ChartLimitSelect value={chartLimits.ranking} onChange={(value) => setChartLimit("ranking", value)} />}
        >
          {rankingChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={rankingDisplay} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
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

        <ChartCard
          title="Profundidade de rolagem"
          description="Scroll médio (%) por guia"
          actions={<ChartLimitSelect value={chartLimits.scroll} onChange={(value) => setChartLimit("scroll", value)} />}
        >
          {scrollChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={scrollDisplay} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
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

        <ChartCard
          title="Tempo médio de leitura"
          description="Em segundos por guia"
          actions={<ChartLimitSelect value={chartLimits.read} onChange={(value) => setChartLimit("read", value)} />}
        >
          {readChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={readDisplay} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
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
          description="Visitantes por fonte — 5 por página"
          loading={sources.isLoading}
          showPercent
          data={sourcesPage.items}
          totalValue={sourceTotal}
          maxValue={sourceMax}
          footer={sourceRows.length > 0 ? (
            <PaginationControls
              page={sourcesPage.page}
              totalPages={sourcesPage.totalPages}
              onPageChange={(page) => setPage("sources", page)}
            />
          ) : null}
        />
      </div>

      <DataTable
        title="Desempenho por guia"
        columns={[
          { key: "title", label: "Guia" },
          { key: "views", label: "Visualizações" },
          { key: "opens", label: "Visitantes únicos" },
          { key: "cta_clicks", label: "Cliques CTA" },
          { key: "internal_link_clicks", label: "Links internos" },
        ]}
        rows={guideClicksPage.items}
        emptyMessage={detailedAnalyticsMessage}
        footer={guideClickRows.length > 0 ? (
          <PaginationControls
            page={guideClicksPage.page}
            totalPages={guideClicksPage.totalPages}
            onPageChange={(page) => setPage("guideClicks", page)}
          />
        ) : null}
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
        rows={ctasPage.items}
        footer={ctaRows.length > 0 ? (
          <PaginationControls
            page={ctasPage.page}
            totalPages={ctasPage.totalPages}
            onPageChange={(page) => setPage("ctas", page)}
          />
        ) : null}
      />

      <DataTable
        title="Links internos mais clicados"
        columns={[
          { key: "link_label", label: "Link" },
          { key: "guide_label", label: "Guia de origem" },
          { key: "link_url", label: "Destino" },
          { key: "clicks", label: "Cliques" },
        ]}
        rows={linksPage.items}
        footer={linkRows.length > 0 ? (
          <PaginationControls
            page={linksPage.page}
            totalPages={linksPage.totalPages}
            onPageChange={(page) => setPage("links", page)}
          />
        ) : null}
      />
    </div>
  );
}
