import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  BookOpen, CheckCircle2, AlertTriangle, Loader2, RefreshCw,
  FileText, Zap, Hand, Blend, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KnowledgeEntry } from '@/hooks/useGuideFlowKnowledge';

export interface SourcesNodeData {
  structureEntries: KnowledgeEntry[];
  libraryEntries: KnowledgeEntry[];
  selectedStructureIds: string[];
  selectedLibraryIds: string[];
  suggestedLibraryIds: string[];
  selectionMode: 'auto' | 'manual' | 'combined';
  isLoading: boolean;
  error: string | null;
  onToggleStructure?: (id: string) => void;
  onSelectAllStructure?: () => void;
  onDeselectAllStructure?: () => void;
  onToggleLibrary?: (id: string) => void;
  onClearManualOverride?: () => void;
  onRefresh?: () => void;
}

function SelectionModeBadge({ mode }: { mode: 'auto' | 'manual' | 'combined' }) {
  const config = {
    auto: { icon: Zap, label: 'Automática', className: 'bg-blue-500/10 text-blue-600' },
    manual: { icon: Hand, label: 'Manual', className: 'bg-amber-500/10 text-amber-600' },
    combined: { icon: Blend, label: 'Combinada', className: 'bg-violet-500/10 text-violet-600' },
  }[mode];
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium', config.className)}>
      <Icon className="h-2.5 w-2.5" />
      {config.label}
    </span>
  );
}

function SourcesNodeComponent({ data }: { data: SourcesNodeData }) {
  const {
    structureEntries, libraryEntries,
    selectedStructureIds, selectedLibraryIds, suggestedLibraryIds,
    selectionMode, isLoading, error,
    onToggleStructure, onSelectAllStructure, onDeselectAllStructure,
    onToggleLibrary, onClearManualOverride, onRefresh,
  } = data;

  const hasStructure = structureEntries.length > 0;
  const hasLibrary = libraryEntries.length > 0;
  const isReady = selectedStructureIds.length > 0;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-card border border-border rounded-[1.2rem] shadow-card w-[400px] overflow-hidden">
        <Handle type="source" position={Position.Right} className="!bg-primary !w-3 !h-3 !border-2 !border-card" />

        {/* Header */}
        <div className="bg-primary/8 px-4 py-2.5 border-b border-primary/15 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Fontes do Fluxo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant={isReady ? 'default' : 'secondary'} className="text-[10px] h-5">
              {isLoading ? 'Carregando…' : isReady ? 'Pronto' : 'Incompleto'}
            </Badge>
            {onRefresh && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onRefresh}>
                <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
              </Button>
            )}
          </div>
        </div>

        <div className="p-3 space-y-3 max-h-[520px] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-xs">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando Biblioteca…
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive text-[10px] rounded-md px-3 py-2">
              ⚠ {error}
            </div>
          )}

          {/* ── guide-structure ── */}
          {!isLoading && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {hasStructure ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                  )}
                  <span className="text-xs font-medium">Diretrizes Editoriais</span>
                  <span className="text-[10px] text-muted-foreground">
                    {selectedStructureIds.length}/{structureEntries.length}
                  </span>
                </div>
                {hasStructure && (
                  <div className="flex gap-1">
                    <button
                      onClick={onSelectAllStructure}
                      className="text-[9px] text-primary hover:underline"
                    >
                      Todas
                    </button>
                    <span className="text-[9px] text-muted-foreground">|</span>
                    <button
                      onClick={onDeselectAllStructure}
                      className="text-[9px] text-muted-foreground hover:underline"
                    >
                      Nenhuma
                    </button>
                  </div>
                )}
              </div>

              {hasStructure ? (
                <div className="space-y-0.5 pl-1">
                  {structureEntries.map(entry => {
                    const selected = selectedStructureIds.includes(entry.id);
                    return (
                      <Tooltip key={entry.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onToggleStructure?.(entry.id)}
                            className={cn(
                              'flex items-center gap-1.5 text-[10px] w-full text-left px-2 py-1 rounded-md transition-colors',
                              selected
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-muted-foreground hover:bg-muted'
                            )}
                          >
                            {selected ? (
                              <ToggleRight className="h-3 w-3 shrink-0 text-emerald-500" />
                            ) : (
                              <ToggleLeft className="h-3 w-3 shrink-0 text-muted-foreground" />
                            )}
                            <FileText className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{entry.title}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[240px]">
                          <p className="text-xs font-medium">{entry.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {entry.source_path ?? 'Manual'} · {entry.content.length.toLocaleString()} caracteres
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[10px] text-amber-600 pl-4">
                  Nenhuma diretriz encontrada na Biblioteca. Sincronize o Storage primeiro.
                </p>
              )}

              {hasStructure && (
                <div className="bg-muted/50 rounded-md px-2 py-1 text-[9px] text-muted-foreground">
                  💾 Seleções persistidas entre usos
                </div>
              )}
            </div>
          )}

          {!isLoading && <div className="border-t border-border" />}

          {/* ── guide-library ── */}
          {!isLoading && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {hasLibrary ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                  )}
                  <span className="text-xs font-medium">Bibliotecas Factuais</span>
                  <span className="text-[10px] text-muted-foreground">
                    {selectedLibraryIds.length}/{libraryEntries.length}
                  </span>
                </div>
                {selectedLibraryIds.length > 0 && (
                  <SelectionModeBadge mode={selectionMode} />
                )}
              </div>

              {hasLibrary ? (
                <div className="space-y-0.5 pl-1">
                  {libraryEntries.map(entry => {
                    const selected = selectedLibraryIds.includes(entry.id);
                    const isSuggested = suggestedLibraryIds.includes(entry.id);
                    return (
                      <Tooltip key={entry.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onToggleLibrary?.(entry.id)}
                            className={cn(
                              'flex items-center gap-1.5 text-[10px] w-full text-left px-2 py-1 rounded-md transition-colors',
                              selected
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-muted-foreground hover:bg-muted'
                            )}
                          >
                            {selected ? (
                              <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                            ) : (
                              <div className="h-3 w-3 shrink-0 rounded-full border border-muted-foreground/40" />
                            )}
                            <FileText className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate flex-1">{entry.title}</span>
                            {isSuggested && !selected && (
                              <Zap className="h-2.5 w-2.5 shrink-0 text-blue-500" />
                            )}
                            {isSuggested && selected && (
                              <span className="text-[8px] text-blue-500 shrink-0">auto</span>
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[240px]">
                          <p className="text-xs font-medium">{entry.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {entry.source_path ?? 'Manual'} · {entry.content.length.toLocaleString()} caracteres
                          </p>
                          {isSuggested && <p className="text-[10px] text-blue-500 mt-0.5">⚡ Sugestão automática por relevância</p>}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[10px] text-amber-600 pl-4">
                  Nenhuma biblioteca factual encontrada. Sincronize o Storage primeiro.
                </p>
              )}

              {selectionMode !== 'auto' && onClearManualOverride && (
                <button
                  onClick={onClearManualOverride}
                  className="text-[9px] text-primary hover:underline pl-2"
                >
                  ↩ Voltar para sugestão automática
                </button>
              )}

              {hasLibrary && selectedLibraryIds.length === 0 && (
                <p className="text-[10px] text-amber-600 pl-2">
                  ⚠ Preencha tema/palavra-chave para sugestão automática ou selecione manualmente.
                </p>
              )}
            </div>
          )}

          {/* ── Summary ── */}
          {!isLoading && (
            <div className={cn(
              'rounded-lg px-3 py-2 text-[10px]',
              isReady && selectedLibraryIds.length > 0
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : isReady
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                  : 'bg-destructive/10 text-destructive'
            )}>
              {isReady && selectedLibraryIds.length > 0 ? (
                <>✅ {selectedStructureIds.length} diretriz(es) + {selectedLibraryIds.length} biblioteca(s) — geração fundamentada</>
              ) : isReady ? (
                <>⚠ {selectedStructureIds.length} diretriz(es) ativa(s), mas sem biblioteca factual selecionada</>
              ) : hasStructure ? (
                <>⚠ Nenhuma diretriz selecionada — ative ao menos uma</>
              ) : (
                <>⚠ Biblioteca de Conhecimento vazia — sincronize o Storage em Biblioteca</>
              )}
            </div>
          )}

          {/* ── What feeds what ── */}
          {!isLoading && (hasStructure || hasLibrary) && (
            <div className="border-t border-border pt-2 space-y-1">
              <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">O que alimenta o quê</p>
              {selectedStructureIds.length > 0 && (
                <div className="text-[9px] text-muted-foreground pl-1">
                  <span className="font-medium text-foreground">Diretrizes →</span> títulos, estrutura, ritmo, linguagem, imagens, links
                </div>
              )}
              {selectedLibraryIds.length > 0 && (
                <div className="text-[9px] text-muted-foreground pl-1">
                  <span className="font-medium text-foreground">Bibliotecas →</span> base factual, contexto, referências
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export const SourcesNode = memo(SourcesNodeComponent);
