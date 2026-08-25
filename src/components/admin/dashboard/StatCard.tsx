import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  icon?: LucideIcon;
  trend?: string;
  trendTone?: 'positive' | 'negative' | 'neutral';
}

export function StatCard({ title, value, description, icon: Icon, trend, trendTone = 'neutral' }: StatCardProps) {
  const trendColor = trendTone === 'positive'
    ? 'text-emerald-500'
    : trendTone === 'negative'
      ? 'text-red-500'
      : 'text-muted-foreground';

  return (
    <Card className="h-full">
      <CardContent className={`flex h-full flex-col p-6 ${description ? "min-h-[178px]" : ""}`}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-2xl font-bold">{value}</p>
          {trend && <span className={`text-[11px] font-medium ${trendColor}`}>{trend}</span>}
        </div>
        {description && <p className="mt-auto pt-4 text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}
