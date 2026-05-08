import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditSummaryCardProps {
  run: {
    run_date: string;
    avg_score: number;
    total_findings: number;
    status: string;
  } | null | undefined;
}

export function AuditSummaryCard({ run }: AuditSummaryCardProps) {
  if (!run) return null;

  const score = run.avg_score;

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-wrap items-center gap-6">
      <div>
        <p className="text-xs text-muted-foreground">Última auditoria</p>
        <p className="text-sm font-medium">
          {format(new Date(run.run_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      </div>
      <div className="text-center">
        <p className="text-xs text-muted-foreground">Score médio</p>
        <p className="text-2xl font-bold">{score}</p>
      </div>
      <Badge variant={score >= 80 ? 'default' : score >= 50 ? 'secondary' : 'destructive'}>
        {score >= 80 ? 'Bom' : score >= 50 ? 'Regular' : 'Crítico'}
      </Badge>
      <div className="text-center">
        <p className="text-xs text-muted-foreground">Issues</p>
        <p className="text-sm font-semibold">{run.total_findings}</p>
      </div>
      <Badge variant="outline" className="text-xs capitalize">
        {run.status}
      </Badge>
    </div>
  );
}
