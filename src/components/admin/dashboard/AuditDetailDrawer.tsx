import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface AuditIssue {
  issue: string;
  category: string;
  impact: string;
  evidence: string;
  fix: string;
  priority: number;
}

interface AuditFinding {
  url: string;
  path: string;
  score: number;
  issues: AuditIssue[];
  raw: Record<string, unknown>;
  audit_type: 'seo' | 'copywriting';
}

interface AuditDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finding: AuditFinding | null;
}

function impactColor(impact: string) {
  switch (impact?.toLowerCase()) {
    case 'high': return 'destructive';
    case 'medium': return 'default';
    case 'low': return 'secondary';
    default: return 'outline';
  }
}

function SeoRawDetails({ raw }: { raw: Record<string, unknown> }) {
  const entries: { label: string; value: string }[] = [];
  if (raw.status_code != null) entries.push({ label: 'Status Code', value: String(raw.status_code) });
  if (raw.ttfb_ms != null) entries.push({ label: 'TTFB', value: `${raw.ttfb_ms}ms` });
  if (raw.health != null) entries.push({ label: 'Health', value: String(raw.health) });

  if (entries.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-3">
      {entries.map(e => (
        <div key={e.label} className="rounded-md border p-3 text-center">
          <p className="text-xs text-muted-foreground">{e.label}</p>
          <p className="text-sm font-semibold">{e.value}</p>
        </div>
      ))}
    </div>
  );
}

function CopyRawDetails({ raw }: { raw: Record<string, unknown> }) {
  const entries: { label: string; value: string }[] = [];
  if (raw.status_code != null) entries.push({ label: 'Status Code', value: String(raw.status_code) });
  if (raw.word_count != null) entries.push({ label: 'Palavras', value: String(raw.word_count) });
  if (raw.h1_count != null) entries.push({ label: 'H1', value: String(raw.h1_count) });
  if (raw.h2_count != null) entries.push({ label: 'H2', value: String(raw.h2_count) });
  if (raw.paragraphs_count != null) entries.push({ label: 'Parágrafos', value: String(raw.paragraphs_count) });
  if (raw.avg_sentence_length != null) entries.push({ label: 'Méd. frase', value: `${raw.avg_sentence_length} palavras` });

  if (entries.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-3">
      {entries.map(e => (
        <div key={e.label} className="rounded-md border p-3 text-center">
          <p className="text-xs text-muted-foreground">{e.label}</p>
          <p className="text-sm font-semibold">{e.value}</p>
        </div>
      ))}
    </div>
  );
}

export function AuditDetailDrawer({ open, onOpenChange, finding }: AuditDetailDrawerProps) {
  if (!finding) return null;

  const isSeo = finding.audit_type === 'seo';
  const issues = Array.isArray(finding.issues) ? finding.issues : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="text-base">
            {isSeo ? 'SEO Audit' : 'Copy Audit'} — Detalhes
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 pb-6">
          <div className="space-y-5">
            {/* URL + Score */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">URL</p>
              <p className="text-sm font-medium break-all">{finding.path || finding.url}</p>
            </div>

            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Score</p>
                <p className="text-2xl font-bold">{finding.score}</p>
              </div>
              <Badge variant={finding.score >= 80 ? 'default' : finding.score >= 50 ? 'secondary' : 'destructive'}>
                {finding.score >= 80 ? 'Bom' : finding.score >= 50 ? 'Regular' : 'Crítico'}
              </Badge>
            </div>

            {/* Raw metrics */}
            {isSeo ? <SeoRawDetails raw={finding.raw} /> : <CopyRawDetails raw={finding.raw} />}

            <Separator />

            {/* Issues */}
            <div>
              <h4 className="text-sm font-semibold mb-3">
                Issues ({issues.length})
              </h4>
              {issues.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma issue encontrada.</p>
              ) : (
                <div className="space-y-4">
                  {issues.map((issue, i) => (
                    <div key={i} className="rounded-lg border p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{issue.issue}</p>
                        <Badge variant={impactColor(issue.impact)} className="text-xs shrink-0">
                          {issue.impact}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p><span className="font-medium text-foreground">Categoria:</span> {issue.category}</p>
                        <p><span className="font-medium text-foreground">Evidência:</span> {issue.evidence}</p>
                        <p><span className="font-medium text-foreground">Correção:</span> {issue.fix}</p>
                        {issue.priority != null && (
                          <p><span className="font-medium text-foreground">Prioridade:</span> {issue.priority}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
