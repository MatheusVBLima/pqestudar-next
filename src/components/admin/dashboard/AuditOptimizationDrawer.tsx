import { useState, useEffect, useMemo, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Pencil, History, RotateCcw, RefreshCw, AlertTriangle, Check, Clock, Sparkles } from 'lucide-react';
import { resolveAuditedUrl } from '@/lib/audit-url-resolver';
import { getProfile, type EditorField } from '@/lib/audit-editor-profiles';
import { classifyIssues, getApplicabilitySummary, type Applicability } from '@/lib/issue-applicability';
import { AISuggestionsPanel } from './AISuggestionsPanel';
import {
  useLoadEntityFields,
  useVersionHistory,
  useSaveVersion,
  useRollbackVersion,
  useUpdateVersionScore,
  type ContentVersion,
} from '@/hooks/useContentVersions';
import { extractDomFromIframe } from '@/lib/iframe-audit-engine';
import { analyzeCopy } from '@/lib/copy-audit-analyzer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getErrorMessage } from '@/lib/error-message';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finding: AuditFinding | null;
  onReauditComplete?: () => void;
}

function impactColor(impact: string) {
  switch (impact?.toLowerCase()) {
    case 'high': return 'destructive' as const;
    case 'medium': return 'default' as const;
    case 'low': return 'secondary' as const;
    default: return 'outline' as const;
  }
}

export function AuditOptimizationDrawer({ open, onOpenChange, finding, onReauditComplete }: Props) {
  const [activeTab, setActiveTab] = useState<string>('diagnostico');
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [isReauditing, setIsReauditing] = useState(false);
  const [reauditScore, setReauditScore] = useState<number | null>(null);
  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set());
  const [suggestionSummary, setSuggestionSummary] = useState<{ fields: string[]; count: number } | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);

  const path = finding?.path ?? null;
  const resolved = useMemo(() => path ? resolveAuditedUrl(path) : null, [path]);
  const profile = useMemo(() => resolved ? getProfile(resolved.profileKey) : null, [resolved]);

  const { data: loadResult, isLoading: isLoadingFields } = useLoadEntityFields(open && resolved ? path : null);
  const { data: versions, isLoading: isLoadingHistory } = useVersionHistory(open ? path : null);

  

  const classifiedIssues = useMemo(() => {
    if (!finding?.issues || !profile) return [];
    const fieldKeys = profile.fields.map(f => f.key);
    return classifyIssues(finding.issues, fieldKeys);
  }, [finding?.issues, profile]);

  const applicabilitySummary = useMemo(() => getApplicabilitySummary(classifiedIssues), [classifiedIssues]);

  const saveMutation = useSaveVersion();
  const rollbackMutation = useRollbackVersion();
  const updateScoreMutation = useUpdateVersionScore();

  // Reset state when drawer opens/closes or finding changes
  useEffect(() => {
    if (open && loadResult?.fields) {
      setEditedFields({});
      setReauditScore(null);
      setHighlightedFields(new Set());
      setSuggestionSummary(null);
      setShowAIPanel(false);
    }
  }, [open, loadResult]);

  const currentFields = useMemo(() => loadResult?.fields ?? {}, [loadResult?.fields]);
  const isSupported = !!resolved && loadResult?.supported !== false;

  const hasChanges = useMemo(() => {
    return Object.entries(editedFields).some(([key, val]) => val !== (currentFields[key] ?? ''));
  }, [editedFields, currentFields]);

  const getFieldValue = useCallback((key: string) => {
    return editedFields[key] ?? currentFields[key] ?? '';
  }, [editedFields, currentFields]);

  const setFieldValue = useCallback((key: string, value: string) => {
    setEditedFields(prev => ({ ...prev, [key]: value }));
  }, []);

  // Build diff: which fields changed
  const changedFields = useMemo(() => {
    const changes: { key: string; label: string; oldValue: string; newValue: string }[] = [];
    if (!profile) return changes;
    for (const field of profile.fields) {
      const edited = editedFields[field.key];
      if (edited !== undefined && edited !== (currentFields[field.key] ?? '')) {
        changes.push({
          key: field.key,
          label: field.label,
          oldValue: currentFields[field.key] ?? '',
          newValue: edited,
        });
      }
    }
    return changes;
  }, [editedFields, currentFields, profile]);

  // Validate
  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    if (!profile) return errors;
    for (const field of profile.fields) {
      const val = getFieldValue(field.key);
      if (field.required && !val.trim()) {
        errors[field.key] = 'Campo obrigatório';
      }
    }
    return errors;
  }, [getFieldValue, profile]);

  const canSave = hasChanges && Object.keys(validationErrors).length === 0;

  // Save handler
  const handleSave = async () => {
    if (!resolved || !canSave || !path) return;

    // Only send changed fields
    const changedData: Record<string, string> = {};
    for (const [key, val] of Object.entries(editedFields)) {
      if (val !== (currentFields[key] ?? '')) {
        changedData[key] = val;
      }
    }

    try {
      const result = await saveMutation.mutateAsync({
        path,
        entityType: resolved.entityType,
        entityId: resolved.entityId,
        profileKey: resolved.profileKey,
        fieldData: changedData,
        source: 'copy_audit',
        auditScoreBefore: finding?.score,
        dbId: loadResult?.fields?._db_id as string | undefined,
      });

      toast.success('Versão salva com sucesso!');
      setEditedFields({});

      // Re-audit automatically
      await handleReaudit(result.version_id);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erro ao salvar'));
    }
  };

  // Re-audit handler
  const handleReaudit = async (versionId?: string) => {
    if (!finding || !path) return;
    setIsReauditing(true);
    try {
      const origin = window.location.origin;
      const fullUrl = `${origin}${path}`;
      const snapshot = await extractDomFromIframe(fullUrl, path);
      const result = analyzeCopy(snapshot);
      setReauditScore(result.score);

      // Update version score if we have a version id
      if (versionId) {
        await updateScoreMutation.mutateAsync({
          versionId,
          scoreAfter: result.score,
        });
      }

      toast.success(`Reauditoria concluída! Novo score: ${result.score}`);
      onReauditComplete?.();
    } catch (err: unknown) {
      toast.error('Erro na reauditoria: ' + getErrorMessage(err, 'Erro desconhecido'));
    } finally {
      setIsReauditing(false);
    }
  };

  // Rollback handler
  const handleRollback = async (version: ContentVersion) => {
    if (!path) return;
    try {
      await rollbackMutation.mutateAsync({ versionId: version.id, path });
      setEditedFields({});
    } catch (_err: unknown) {
      // error handled by mutation
    }
  };

  // Open AI panel handler
  const handleOpenAIPanel = () => {
    setShowAIPanel(true);
    setActiveTab('editor');
  };

  // Apply suggestions from AI panel
  const handleApplySuggestions = (updates: Record<string, string>, appliedLabels: string[]) => {
    setEditedFields(prev => ({ ...prev, ...updates }));
    const newHighlights = new Set(Object.keys(updates));
    setHighlightedFields(newHighlights);
    setSuggestionSummary({ fields: appliedLabels, count: appliedLabels.length });
    setTimeout(() => setHighlightedFields(new Set()), 3000);
  };

  if (!finding) return null;

  const issues = Array.isArray(finding.issues) ? finding.issues : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full !max-w-3xl p-0 flex flex-col h-full overflow-hidden" side="right">
        <SheetHeader className="px-6 pt-6 pb-2 shrink-0">
          <SheetTitle className="text-base flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" />
            Central de Otimização — Copy Audit
          </SheetTitle>
          <p className="text-xs text-muted-foreground break-all">{finding.path}</p>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 shrink-0">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
              <TabsTrigger value="editor" disabled={!isSupported}>
                Editor
              </TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>
          </div>

          {/* ═══ DIAGNÓSTICO ═══ */}
          <TabsContent value="diagnostico" className="flex-1 min-h-0 overflow-hidden mt-0 data-[state=inactive]:hidden">
            <div className="h-full overflow-y-auto px-6 pb-6">
              <div className="space-y-5 pt-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Score</p>
                    <p className="text-3xl font-bold">{reauditScore ?? finding.score}</p>
                  </div>
                  <Badge variant={
                    (reauditScore ?? finding.score) >= 80 ? 'default' :
                    (reauditScore ?? finding.score) >= 50 ? 'secondary' : 'destructive'
                  }>
                    {(reauditScore ?? finding.score) >= 80 ? 'Bom' :
                     (reauditScore ?? finding.score) >= 50 ? 'Regular' : 'Crítico'}
                  </Badge>
                  {reauditScore !== null && reauditScore !== finding.score && (
                    <span className={`text-sm font-medium ${reauditScore > finding.score ? 'text-emerald-600' : 'text-destructive'}`}>
                      {reauditScore > finding.score ? '+' : ''}{reauditScore - finding.score}
                    </span>
                  )}
                </div>

                {/* Raw metrics */}
                <CopyRawDetails raw={finding.raw} />

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold">Issues ({issues.length})</h4>
                    {classifiedIssues.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5"><Check className="h-3 w-3 text-primary" />{applicabilitySummary.auto}</span>
                        <span className="flex items-center gap-0.5"><Pencil className="h-3 w-3 text-amber-500" />{applicabilitySummary.manual}</span>
                      </div>
                    )}
                  </div>
                  {issues.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma issue encontrada.</p>
                  ) : (
                    <div className="space-y-3">
                      {classifiedIssues.map((issue, i) => (
                        <div key={i} className="rounded-lg border p-3 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">{issue.issue}</p>
                            <div className="flex items-center gap-1 shrink-0">
                              <ApplicabilityBadge applicability={issue.applicability} />
                              <Badge variant={impactColor(issue.impact)} className="text-xs">
                                {issue.impact}
                              </Badge>
                            </div>
                          </div>
                          <div className="space-y-0.5 text-xs text-muted-foreground">
                            <p><span className="font-medium text-foreground">Evidência:</span> {issue.evidence}</p>
                            <p><span className="font-medium text-foreground">Correção:</span> {issue.fix}</p>
                            <p className="italic">{issue.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {isSupported && (
                  <Button onClick={() => setActiveTab('editor')} className="w-full">
                    <Pencil className="h-4 w-4 mr-2" />
                    Melhorar página
                  </Button>
                )}
                {!isSupported && resolved === null && (
                  <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                    <AlertTriangle className="h-5 w-5 mx-auto mb-2 text-amber-500" />
                    Edição ainda não suportada para este tipo de página.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ═══ EDITOR ═══ */}
          <TabsContent value="editor" className="flex-1 min-h-0 flex flex-col overflow-hidden mt-0 data-[state=inactive]:hidden">
            <ScrollArea className="flex-1 px-6 pb-4">
              <div className="space-y-5 pt-4">
                {isLoadingFields ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ))}
                  </div>
                ) : !isSupported ? (
                  <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                    Edição não disponível para esta URL.
                  </div>
                ) : profile ? (
                  <>
                    <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">{profile.label}</p>
                      <p>Edite os campos textuais/SEO abaixo. As alterações serão aplicadas diretamente na página.</p>
                    </div>

                    {suggestionSummary && (
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs space-y-1">
                        <p className="font-medium text-foreground flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          {suggestionSummary.count} campo(s) alterado(s) automaticamente
                        </p>
                        <p className="text-muted-foreground">
                          {suggestionSummary.fields.join(', ')}
                        </p>
                      </div>
                    )}

                    {profile.fields.map(field => (
                      <FieldEditor
                        key={field.key}
                        field={field}
                        currentValue={currentFields[field.key] ?? ''}
                        editedValue={getFieldValue(field.key)}
                        onChange={(val) => setFieldValue(field.key, val)}
                        error={validationErrors[field.key]}
                        highlighted={highlightedFields.has(field.key)}
                      />
                    ))}

                    {/* Diff section */}
                    {changedFields.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="text-sm font-semibold mb-3">Diff — Alterações pendentes</h4>
                          <div className="space-y-3">
                            {changedFields.map(change => (
                              <div key={change.key} className="rounded-lg border p-3 space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">{change.label}</p>
                                <div className="grid gap-2">
                                  <div className="rounded bg-destructive/10 p-2 text-xs">
                                    <span className="font-medium text-destructive mr-1">−</span>
                                    <span className="text-foreground">{change.oldValue || '(vazio)'}</span>
                                  </div>
                                  <div className="rounded bg-emerald-500/10 p-2 text-xs">
                                    <span className="font-medium text-emerald-600 mr-1">+</span>
                                    <span className="text-foreground">{change.newValue || '(vazio)'}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : null}
              </div>
            </ScrollArea>

            {isSupported && (
              <div className="border-t p-4 flex items-center gap-2">
                <Button
                  onClick={handleSave}
                  disabled={!canSave || saveMutation.isPending || isReauditing}
                  className="flex-1"
                >
                  {saveMutation.isPending ? 'Salvando…' : isReauditing ? 'Reauditando…' : 'Salvar nova versão'}
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleOpenAIPanel}
                      disabled={isReauditing || saveMutation.isPending}
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Corrigir automaticamente</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleReaudit()}
                      disabled={isReauditing}
                    >
                      <RefreshCw className={`h-4 w-4 ${isReauditing ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reauditar URL</TooltipContent>
                </Tooltip>
              </div>
            )}
          </TabsContent>

          {/* ═══ HISTÓRICO ═══ */}
          <TabsContent value="historico" className="flex-1 min-h-0 overflow-hidden mt-0 data-[state=inactive]:hidden">
            <div className="h-full overflow-y-auto px-6 pb-6">
              <div className="space-y-4 pt-4">
                {isLoadingHistory ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                  </div>
                ) : !versions || versions.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                    <History className="h-5 w-5 mx-auto mb-2" />
                    Nenhuma versão registrada para esta URL.
                  </div>
                ) : (
                  versions.map((version, idx) => (
                    <VersionCard
                      key={version.id}
                      version={version}
                      index={versions.length - idx}
                      onRollback={() => handleRollback(version)}
                      isRollingBack={rollbackMutation.isPending}
                    />
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* AI Suggestions Panel */}
        {profile && path && resolved && (
          <AISuggestionsPanel
            open={showAIPanel}
            onClose={() => setShowAIPanel(false)}
            path={path}
            profileKey={resolved.profileKey}
            fields={profile.fields}
            currentValues={currentFields}
            classifiedIssues={classifiedIssues}
            onApply={handleApplySuggestions}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Sub-components ───

function ApplicabilityBadge({ applicability }: { applicability: Applicability }) {
  switch (applicability) {
    case 'auto':
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary">✅ Auto</Badge>;
    case 'manual':
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/40 text-amber-600">🟡 Manual</Badge>;
    case 'na':
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/40 text-muted-foreground">❌ N/A</Badge>;
  }
}

function FieldEditor({
  field,
  currentValue,
  editedValue,
  onChange,
  error,
  highlighted,
}: {
  field: EditorField;
  currentValue: string;
  editedValue: string;
  onChange: (val: string) => void;
  error?: string;
  highlighted?: boolean;
}) {
  const isOverWarn = field.warnLength && editedValue.length > field.warnLength;
  const isOverMax = field.maxLength && editedValue.length > field.maxLength;
  const highlightClass = highlighted ? 'ring-2 ring-primary/40 transition-all duration-500' : 'transition-all duration-500';

  return (
    <div className={`space-y-1.5 rounded-lg p-2 -m-2 ${highlighted ? 'bg-primary/5' : ''} transition-colors duration-500`}>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{field.label}</Label>
        <span className={`text-xs ${isOverMax ? 'text-destructive' : isOverWarn ? 'text-amber-500' : 'text-muted-foreground'}`}>
          {editedValue.length}{field.warnLength ? `/${field.warnLength}` : ''}{field.maxLength ? ` (máx ${field.maxLength})` : ''}
        </span>
      </div>
      {field.type === 'textarea' ? (
        <Textarea
          value={editedValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={`min-h-[80px] text-sm ${error ? 'border-destructive' : ''} ${highlightClass}`}
        />
      ) : (
        <Input
          value={editedValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={`text-sm ${error ? 'border-destructive' : ''} ${highlightClass}`}
        />
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {currentValue && editedValue !== currentValue && (
        <p className="text-xs text-muted-foreground">
          Atual: <span className="italic">{currentValue.slice(0, 80)}{currentValue.length > 80 ? '…' : ''}</span>
        </p>
      )}
    </div>
  );
}

function VersionCard({
  version,
  index,
  onRollback,
  isRollingBack,
}: {
  version: ContentVersion;
  index: number;
  onRollback: () => void;
  isRollingBack: boolean;
}) {
  const sourceLabel: Record<string, string> = {
    manual: 'Manual',
    copy_audit: 'Copy Audit',
    seo_audit: 'SEO Audit',
    rollback: 'Rollback',
  };

  const sourceColor: Record<string, string> = {
    manual: 'bg-primary/10 text-primary',
    copy_audit: 'bg-blue-500/10 text-blue-600',
    seo_audit: 'bg-emerald-500/10 text-emerald-600',
    rollback: 'bg-amber-500/10 text-amber-600',
  };

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-muted-foreground">v{index}</span>
          <Badge variant="outline" className={`text-xs ${sourceColor[version.source] ?? ''}`}>
            {sourceLabel[version.source] ?? version.source}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {version.audit_score_before != null && (
            <span className="text-xs text-muted-foreground">
              {version.audit_score_before}
              {version.audit_score_after != null && (
                <>
                  {' → '}
                  <span className={version.audit_score_after > version.audit_score_before ? 'text-emerald-600' : 'text-destructive'}>
                    {version.audit_score_after}
                  </span>
                </>
              )}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRollback}
            disabled={isRollingBack}
            title="Restaurar esta versão"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Restaurar
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        {format(new Date(version.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
      </div>
      {version.summary && (
        <p className="text-xs text-muted-foreground">{version.summary}</p>
      )}
      {/* Show field changes */}
      {version.field_data && Object.keys(version.field_data).filter(k => !k.startsWith('_')).length > 0 && (
        <div className="text-xs space-y-1 pt-1">
          {Object.entries(version.field_data)
            .filter(([k]) => !k.startsWith('_'))
            .map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="font-medium text-foreground shrink-0">{key}:</span>
                <span className="text-muted-foreground truncate">{String(value).slice(0, 60)}{String(value).length > 60 ? '…' : ''}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function CopyRawDetails({ raw }: { raw: Record<string, unknown> }) {
  const entries: { label: string; value: string }[] = [];
  if (raw.status != null) entries.push({ label: 'Status', value: String(raw.status) });
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
