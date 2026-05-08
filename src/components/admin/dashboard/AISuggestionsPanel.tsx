import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Sparkles, Loader2, Check, AlertTriangle, ArrowRight, Equal, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { type EditorField } from '@/lib/audit-editor-profiles';
import { type ClassifiedIssue } from '@/lib/issue-applicability';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/error-message';
import { IS_DEV } from '@/lib/runtime-env';

type AIProvider = 'lovable' | 'openai';

interface FieldSuggestion {
  key: string;
  label: string;
  current: string;
  suggested: string;
  changed: boolean;
  selected: boolean;
}

interface SuggestionsResult {
  fieldSuggestions: FieldSuggestion[];
  reasoning?: string;
  skippedIssues: ClassifiedIssue[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  path: string;
  profileKey: string;
  fields: EditorField[];
  currentValues: Record<string, string>;
  classifiedIssues: ClassifiedIssue[];
  onApply: (updates: Record<string, string>, appliedLabels: string[]) => void;
}

export function AISuggestionsPanel({
  open,
  onClose,
  path,
  profileKey,
  fields,
  currentValues,
  classifiedIssues,
  onApply,
}: Props) {
  const [provider, setProvider] = useState<AIProvider>('lovable');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<SuggestionsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const autoIssues = useMemo(() => classifiedIssues.filter(i => i.applicability === 'auto'), [classifiedIssues]);
  const manualIssues = useMemo(() => classifiedIssues.filter(i => i.applicability !== 'auto'), [classifiedIssues]);

  const changedSuggestions = useMemo(() => result?.fieldSuggestions.filter(s => s.changed) ?? [], [result]);
  const selectedSuggestions = useMemo(() => changedSuggestions.filter(s => s.selected), [changedSuggestions]);

  // The button is enabled whenever there are editable fields — issues are context, not a gate
  const canGenerate = fields.length > 0;

  const toggleSuggestion = (key: string) => {
    if (!result) return;
    setResult({
      ...result,
      fieldSuggestions: result.fieldSuggestions.map(s =>
        s.key === key ? { ...s, selected: !s.selected } : s
      ),
    });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const fieldsPayload = fields.map(f => ({
        key: f.key,
        label: f.label,
        value: currentValues[f.key] ?? '',
        maxLength: f.maxLength,
        warnLength: f.warnLength,
      }));

      // Send ALL issues as context to the AI, not just auto-applicable ones
      const issuesPayload = classifiedIssues.map(i => ({
        issue: i.issue,
        category: i.category,
        evidence: i.evidence,
        fix: i.fix,
        applicability: i.applicability,
      }));

      const { data, error: fnError } = await supabase.functions.invoke('generate-copy-suggestions', {
        body: {
          url: path,
          fields: fieldsPayload,
          issues: issuesPayload,
          profileKey,
          provider,
        },
      });

      if (fnError) throw new Error(fnError.message || 'Erro ao gerar sugestões');
      if (!data?.suggestions) throw new Error('Resposta inválida do serviço de IA');

      const suggestions = data.suggestions as Record<string, string>;
      const fieldSuggestions: FieldSuggestion[] = fields.map(f => {
        const current = (currentValues[f.key] ?? '').trim();
        const suggested = (suggestions[f.key] ?? '').trim();
        const changed = !!suggested && suggested !== current;
        return {
          key: f.key,
          label: f.label,
          current,
          suggested: suggested || current,
          changed,
          selected: changed,
        };
      });

      if (IS_DEV) {
        console.log('[AI Panel] Provider:', provider);
        console.log('[AI Panel] Suggestions:', suggestions);
        console.log('[AI Panel] Changed:', fieldSuggestions.filter(s => s.changed).map(s => s.key));
      }

      setResult({
        fieldSuggestions,
        reasoning: data.reasoning,
        skippedIssues: manualIssues,
      });
    } catch (err: unknown) {
      console.error('[AI Panel] Error:', err);
      const msg = getErrorMessage(err, 'Erro ao gerar sugestões');
      setError(provider === 'openai' ? `${msg}\n\nTente novamente com Lovable AI.` : msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    const updates: Record<string, string> = {};
    const labels: string[] = [];
    for (const s of selectedSuggestions) {
      updates[s.key] = s.suggested;
      labels.push(s.label);
    }
    if (labels.length === 0) {
      toast.info('Nenhum campo selecionado para aplicar.');
      return;
    }
    onApply(updates, labels);
    toast.success(`${labels.length} campo(s) preenchido(s) no editor. Revise e clique em "Salvar nova versão".`);
    onClose();
  };

  const handleClose = () => {
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Correção automática
          </DialogTitle>
          <DialogDescription className="text-xs">
            Gera sugestões de melhoria para todos os campos editáveis usando boas práticas de copy.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-5">
          {/* Provider selector */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Provedor de IA</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as AIProvider)} disabled={isGenerating}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lovable">Lovable AI (padrão)</SelectItem>
                <SelectItem value="openai">OpenAI (config do sistema)</SelectItem>
              </SelectContent>
            </Select>
            {provider === 'openai' && (
              <p className="text-[11px] text-muted-foreground">
                Usa modelo e API Key configurados em /admin/concursos/orquestracao-ia (OPENAI_API_KEY).
              </p>
            )}
          </div>

          {/* Editable fields info */}
          <div className="rounded-lg border p-3 space-y-2 text-xs">
            <p className="font-medium text-sm flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-primary" />
              {fields.length} campo(s) editável(is) detectado(s)
            </p>
            <p className="text-muted-foreground">
              {fields.map(f => f.label).join(', ')}
            </p>
          </div>

          {/* Issues context summary */}
          {classifiedIssues.length > 0 && (
            <div className="rounded-lg border p-3 space-y-2 text-xs">
              <p className="font-medium text-sm">Contexto do diagnóstico</p>
              <div className="flex items-center gap-3">
                {autoIssues.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Check className="h-3 w-3 text-primary" />
                    {autoIssues.length} corrigível(is) via campos
                  </span>
                )}
                {manualIssues.length > 0 && (
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    {manualIssues.length} estrutural(is)
                  </span>
                )}
              </div>
              <p className="text-muted-foreground">
                A IA usará todas as issues como contexto para melhorar os campos disponíveis, mesmo as estruturais.
              </p>
            </div>
          )}

          {classifiedIssues.length === 0 && !result && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              <p>Nenhuma issue no diagnóstico, mas a IA ainda pode sugerir melhorias de copy com base em boas práticas (clareza, tamanho de frase, SEO, etc.).</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive whitespace-pre-line">
              {error}
            </div>
          )}

          {/* Generating skeleton */}
          {isGenerating && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando sugestões com {provider === 'lovable' ? 'Lovable AI' : 'OpenAI'}…
              </div>
              {fields.map(f => (
                <div key={f.key} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {result && !isGenerating && (
            <div className="space-y-4">
              {result.reasoning && (
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Raciocínio da IA</p>
                  {result.reasoning}
                </div>
              )}

              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Pré-visualização
                  {changedSuggestions.length > 0 && (
                    <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 border-primary/40 text-primary">
                      {changedSuggestions.length} campo(s) alterado(s)
                    </Badge>
                  )}
                </p>
                {changedSuggestions.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    Nenhuma melhoria detectada com os campos atuais. Os textos já estão adequados segundo a análise da IA.
                  </p>
                )}
              </div>

              {/* Changed fields first, then unchanged */}
              {result.fieldSuggestions
                .sort((a, b) => (a.changed === b.changed ? 0 : a.changed ? -1 : 1))
                .map(s => (
                  <FieldDiff
                    key={s.key}
                    suggestion={s}
                    onToggle={() => toggleSuggestion(s.key)}
                  />
                ))}

              {/* Structural/manual issues note */}
              {result.skippedIssues.length > 0 && (
                <>
                  <Separator />
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2 text-xs">
                    <p className="font-medium text-amber-600">
                      {result.skippedIssues.length} issue(s) estrutural(is)/manual(is)
                    </p>
                    <p className="text-muted-foreground">
                      Estas issues dependem de alterações no template/componente e não podem ser resolvidas pelos campos editáveis:
                    </p>
                    <ul className="space-y-1 text-muted-foreground">
                      {result.skippedIssues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-500 mt-0.5">•</span>
                          <span>{issue.issue} — <em>{issue.reason}</em></span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={handleClose} className="flex-1" disabled={isGenerating}>
            Fechar
          </Button>
          {!result ? (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !canGenerate}
              className="flex-1"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              {isGenerating ? 'Gerando…' : 'Gerar sugestões'}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => { setResult(null); setError(null); }}
                className="shrink-0"
              >
                Regenerar
              </Button>
              <Button
                onClick={handleApply}
                disabled={selectedSuggestions.length === 0}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-1" />
                Aplicar no editor ({selectedSuggestions.length})
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FieldDiff({ suggestion, onToggle }: { suggestion: FieldSuggestion; onToggle: () => void }) {
  const [expanded, setExpanded] = useState(suggestion.changed);

  return (
    <div className={cn(
      'rounded-lg border p-3 space-y-2 text-xs transition-colors',
      suggestion.changed ? 'border-primary/30' : 'border-muted'
    )}>
      <button
        className="w-full flex items-center justify-between text-left gap-2"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {suggestion.changed && (
            <Checkbox
              checked={suggestion.selected}
              onCheckedChange={() => onToggle()}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0"
            />
          )}
          <span className="font-medium text-sm">{suggestion.label}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {suggestion.changed ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary">
              Alterado
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
              <Equal className="h-3 w-3 mr-0.5" />
              Igual
            </Badge>
          )}
        </div>
      </button>

      {expanded && (
        <div className="space-y-2 pt-1">
          <div className="rounded bg-destructive/10 p-2.5">
            <span className="font-medium text-destructive mr-1.5">Atual</span>
            <span className="text-foreground">{suggestion.current || '(vazio)'}</span>
          </div>
          {suggestion.changed && (
            <>
              <div className="flex justify-center">
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="rounded bg-emerald-500/10 p-2.5">
                <span className="font-medium text-emerald-600 mr-1.5">Sugestão</span>
                <span className="text-foreground">{suggestion.suggested}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
