import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type Period = 'day' | 'week' | 'month' | 'year' | 'all';

const labels: Record<Period, string> = {
  day: 'Dia',
  week: 'Semana',
  month: 'Mês',
  year: 'Ano',
  all: 'Todo histórico',
};

interface PeriodSelectorProps {
  value: Period;
  onChange: (p: Period) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-[1.2rem] border p-1 bg-muted/30">
      {(Object.keys(labels) as Period[]).map((p) => (
        <Button
          key={p}
          variant={value === p ? 'default' : 'ghost'}
          size="sm"
          className={cn('h-7 text-xs rounded-[1rem]', value !== p && 'text-muted-foreground')}
          onClick={() => onChange(p)}
        >
          {labels[p]}
        </Button>
      ))}
    </div>
  );
}
