import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ReactNode } from "react";

interface BarItem {
  label: string;
  value: number;
}

interface HorizontalBarsCardProps {
  title: string;
  description?: string;
  data?: BarItem[];
  loading?: boolean;
  showPercent?: boolean;
  emptyMessage?: string;
  footer?: ReactNode;
  maxValue?: number;
  totalValue?: number;
}

export function HorizontalBarsCard({
  title,
  description,
  data,
  loading,
  showPercent,
  footer,
  maxValue,
  totalValue,
  emptyMessage = "Sem dados no período.",
}: HorizontalBarsCardProps) {
  const max = maxValue ?? (data && data.length > 0 ? Math.max(...data.map((d) => d.value)) : 0);
  const total = totalValue ?? (data ? data.reduce((sum, d) => sum + d.value, 0) : 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 rounded-md bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{emptyMessage}</p>
        ) : (
          <ul className="space-y-2.5">
            {data.map((item) => {
              const pct = max > 0 ? (item.value / max) * 100 : 0;
              const sharePct = total > 0 ? (item.value / total) * 100 : 0;
              return (
                <li key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-foreground/90" title={item.label}>
                      {item.label}
                    </span>
                    <span className="tabular-nums text-muted-foreground shrink-0">
                      {item.value.toLocaleString("pt-BR")}
                      {showPercent ? ` · ${sharePct.toFixed(1)}%` : ""}
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
        {footer ? <div className="mt-4 border-t border-border pt-3">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}
