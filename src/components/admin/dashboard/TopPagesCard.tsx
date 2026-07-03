"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TopPage {
  path: string;
  visitors: number;
}

interface TopPagesCardProps {
  data?: TopPage[];
  loading?: boolean;
  periodLabel?: string;
}

const PAGE_SIZE = 10;

const filters = [
  { id: "all", label: "Todas", matches: () => true },
  {
    id: "tools",
    label: "Ferramentas",
    matches: (path: string) => path === "/ferramentas" || path.startsWith("/ferramentas/"),
  },
  {
    id: "guides",
    label: "Guias",
    matches: (path: string) => path === "/guias" || path.startsWith("/guias/"),
  },
  {
    id: "exclusives",
    label: "Exclusivos",
    matches: (path: string) => path === "/exclusivos" || path.startsWith("/exclusivos/"),
  },
  {
    id: "votes",
    label: "Votações",
    matches: (path: string) => path === "/votacoes" || path.startsWith("/votacoes/"),
  },
  {
    id: "saved",
    label: "Salvos",
    matches: (path: string) => path === "/salvos" || path === "/ferramentas/salvos",
  },
] as const;

export function TopPagesCard({ data, loading, periodLabel }: TopPagesCardProps) {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const selectedFilter = filters.find((filter) => filter.id === activeFilter) ?? filters[0];
  const filteredData = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return (data ?? []).filter(
      (item) => selectedFilter.matches(item.path) && (!term || item.path.toLocaleLowerCase("pt-BR").includes(term)),
    );
  }, [data, search, selectedFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleData = filteredData.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const max = filteredData.length > 0 ? Math.max(...filteredData.map((item) => item.visitors)) : 0;

  useEffect(() => {
    setPage(1);
  }, [activeFilter, search, periodLabel]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Páginas mais visitadas</CardTitle>
        <CardDescription>{data?.length ?? 0} páginas registradas · {periodLabel ?? "Últimos 30 dias"}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 rounded-md bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sem dados no período.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <Button
                  key={filter.id}
                  type="button"
                  size="sm"
                  variant={activeFilter === filter.id ? "default" : "outline"}
                  className="h-8 rounded-[1rem] text-xs"
                  onClick={() => setActiveFilter(filter.id)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar rota ou slug..."
                className="h-9 pl-9"
              />
            </div>

            {visibleData.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma página encontrada.</p>
            ) : (
              <ul className="space-y-2.5">
                {visibleData.map((item) => {
                  const pct = max > 0 ? (item.visitors / max) * 100 : 0;
                  return (
                    <li key={item.path} className="space-y-1">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate font-mono text-xs text-foreground/90" title={item.path}>
                          {item.path}
                        </span>
                        <span className="tabular-nums text-muted-foreground shrink-0">
                          {item.visitors.toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary/70 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {filteredData.length} {filteredData.length === 1 ? "página" : "páginas"}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-md text-xs"
                  disabled={safePage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Anterior
                </Button>
                <span className="min-w-20 text-center text-xs text-muted-foreground">
                  Página {safePage} de {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-md text-xs"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
