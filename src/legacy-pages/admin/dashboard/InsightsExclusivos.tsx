"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Download, Eye, MousePointerClick, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/admin/dashboard/PageHeader";
import { PeriodSelector, type Period } from "@/components/admin/dashboard/PeriodSelector";
import { periodToRange } from "@/components/admin/dashboard/periodHelper";
import { StatCard } from "@/components/admin/dashboard/StatCard";
import { ChartCard } from "@/components/admin/dashboard/ChartCard";
import { DataTable } from "@/components/admin/dashboard/DataTable";
import { supabase } from "@/integrations/supabase/client";

type ExclusiveRow = {
  product_id: string;
  title: string;
  category: string;
  is_active: boolean;
  card_opens: number;
  detail_opens: number;
  visitors: number;
  downloads: number;
  avg_read_seconds: number;
};

type DashboardData = {
  overview: {
    showcase_views: number;
    showcase_visitors: number;
    card_opens: number;
    detail_opens: number;
    downloads: number;
    avg_read_seconds: number;
  };
  timeline: Array<{ day: string; showcase_views: number; detail_opens: number; downloads: number }>;
  products: ExclusiveRow[];
};

const EMPTY: DashboardData = {
  overview: { showcase_views: 0, showcase_visitors: 0, card_opens: 0, detail_opens: 0, downloads: 0, avg_read_seconds: 0 },
  timeline: [],
  products: [],
};

export default function InsightsExclusivos() {
  const [period, setPeriod] = useState<Period>("month");
  const range = periodToRange(period);
  const { data = EMPTY, isLoading, error } = useQuery({
    queryKey: ["insights-exclusivos", period],
    queryFn: async () => {
      const { data: result, error: rpcError } = await supabase.rpc("analytics_exclusives_dashboard_public", {
        start_at: range.start_at,
        end_at: range.end_at,
      });
      if (rpcError) throw rpcError;
      return (result ?? EMPTY) as unknown as DashboardData;
    },
    staleTime: 5 * 60 * 1000,
  });

  const ranking = useMemo(() => data.products.slice(0, 10), [data.products]);
  const tableRows = data.products.map((row) => ({
    material: row.title,
    categoria: row.category,
    status: row.is_active ? "Ativo" : "Oculto",
    aberturas: String(row.card_opens),
    leitores: String(row.visitors),
    downloads: String(row.downloads),
    leitura: row.avg_read_seconds > 0 ? `${Math.round(row.avg_read_seconds)}s` : "—",
  }));
  const conversion = data.overview.card_opens > 0
    ? `${((data.overview.downloads / data.overview.card_opens) * 100).toFixed(1)}%`
    : "0%";
  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exclusivos"
        description="Descubra como os visitantes exploram, leem e baixam os materiais exclusivos."
        actions={<PeriodSelector value={period} onChange={setPeriod} />}
      />

      {error && (
        <div className="rounded-[1.2rem] border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-semibold">Não foi possível carregar as métricas de Exclusivos.</p>
          <p className="mt-1 text-xs opacity-90">
            {errorMessage ?? "Confirme se a migração de analytics foi aplicada no Supabase."}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Visitas à vitrine" value={isLoading ? "—" : String(data.overview.showcase_views)} icon={Eye} />
        <StatCard title="Visitantes" value={isLoading ? "—" : String(data.overview.showcase_visitors)} icon={Users} />
        <StatCard title="Materiais abertos" value={isLoading ? "—" : String(data.overview.card_opens)} icon={MousePointerClick} />
        <StatCard title="Downloads" value={isLoading ? "—" : String(data.overview.downloads)} icon={Download} />
        <StatCard title="Conversão" value={isLoading ? "—" : conversion} icon={BarChart3} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Comportamento ao longo do período" description="Vitrine, abertura de materiais e downloads por dia">
          {data.timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.timeline} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Line type="monotone" dataKey="showcase_views" name="Vitrine" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="detail_opens" name="Leituras" stroke="hsl(160 84% 39%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="downloads" name="Downloads" stroke="hsl(38 92% 50%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : undefined}
        </ChartCard>

        <ChartCard title="Materiais mais acessados" description="Novos materiais entram neste ranking automaticamente">
          {ranking.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ranking} layout="vertical" margin={{ top: 5, right: 12, left: 24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="title" width={125} tick={{ fontSize: 10 }} tickFormatter={(value) => value.length > 20 ? `${value.slice(0, 20)}…` : value} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Bar dataKey="card_opens" name="Aberturas" fill="hsl(var(--primary))" radius={[0, 5, 5, 0]} />
                <Bar dataKey="downloads" name="Downloads" fill="hsl(var(--primary) / 0.42)" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : undefined}
        </ChartCard>
      </div>

      <DataTable
        title="Desempenho por material"
        columns={[
          { key: "material", label: "Material", className: "min-w-[280px]" },
          { key: "categoria", label: "Categoria", className: "min-w-[140px]" },
          { key: "status", label: "Status" },
          { key: "aberturas", label: "Aberturas" },
          { key: "leitores", label: "Leitores" },
          { key: "downloads", label: "Downloads" },
          { key: "leitura", label: "Leitura média" },
        ]}
        rows={tableRows}
      />
    </div>
  );
}
