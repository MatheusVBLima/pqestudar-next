import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface TopPage {
  path: string;
  visitors: number;
}

interface TopPagesCardProps {
  data?: TopPage[];
  loading?: boolean;
  periodLabel?: string;
}

export function TopPagesCard({ data, loading, periodLabel }: TopPagesCardProps) {
  const max = data && data.length > 0 ? Math.max(...data.map((d) => d.visitors)) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Páginas mais visitadas</CardTitle>
        <CardDescription>Top 10 · {periodLabel ?? "Últimos 30 dias"}</CardDescription>
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
          <ul className="space-y-2.5">
            {data.map((item) => {
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
      </CardContent>
    </Card>
  );
}
