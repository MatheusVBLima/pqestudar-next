import { useState } from 'react';
import { ChevronRight, ChevronLeft, BookOpen, Compass, Target, FolderOpen, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { findOption, TIPOS_GUIA, CATEGORIAS, INTENCOES, type GuideOption } from '@/lib/guide-editorial-options';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface EditorialSummaryPanelProps {
  tipo: string;
  categoria: string;
  intencao: string;
  activeStructureCount: number;
  totalStructureCount: number;
  activeLibraryNames: string[];
  selectionMode: 'auto' | 'manual' | 'combined';
}

function SummaryItem({ icon: Icon, label, option, className }: {
  icon: React.ElementType;
  label: string;
  option: GuideOption | undefined;
  className?: string;
}) {
  if (!option) return null;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span>{label}</span>
      </div>
      <p className="text-sm font-medium text-foreground">{option.label}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{option.shortDescription}</p>
      <div className="rounded-md bg-primary/5 border border-primary/10 px-2.5 py-1.5">
        <p className="text-[11px] text-primary/90 leading-relaxed">
          <span className="font-semibold">Impacto na geração:</span>{' '}
          {option.generationImpact}
        </p>
      </div>
    </div>
  );
}

export function EditorialSummaryPanel({
  tipo,
  categoria,
  intencao,
  activeStructureCount,
  totalStructureCount,
  activeLibraryNames,
  selectionMode,
}: EditorialSummaryPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const tipoOption = findOption(TIPOS_GUIA, tipo);
  const categoriaOption = findOption(CATEGORIAS, categoria);
  const intencaoOption = findOption(INTENCOES, intencao);

  const hasSelections = tipoOption || categoriaOption || intencaoOption;

  return (
    <TooltipProvider>
      <div className={cn(
        "fixed right-0 top-1/2 -translate-y-1/2 z-40 transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Toggle tab */}
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full",
            "flex items-center justify-center w-10 h-20 rounded-l-lg",
            "bg-card border border-r-0 border-border shadow-md",
            "text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors",
            hasSelections && "border-primary/30"
          )}
        >
          <div className="flex flex-col items-center gap-1">
            {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            <BookOpen className="h-3.5 w-3.5" />
          </div>
          {hasSelections && !isOpen && (
            <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          )}
        </button>

        {/* Panel content */}
        <div className={cn(
          "w-80 max-h-[80vh] bg-card border border-border rounded-l-xl shadow-xl overflow-hidden flex flex-col"
        )}>
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-primary" />
              Resumo Editorial
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Como suas escolhas influenciam a geração
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!hasSelections && activeStructureCount === 0 && activeLibraryNames.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">
                Preencha os campos do formulário para ver o resumo editorial.
              </p>
            )}

            <SummaryItem icon={Compass} label="Tipo de Guia" option={tipoOption} />
            <SummaryItem icon={FolderOpen} label="Categoria" option={categoriaOption} />
            <SummaryItem icon={Target} label="Intenção" option={intencaoOption} />

            {/* Sources summary */}
            {(activeStructureCount > 0 || activeLibraryNames.length > 0) && (
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  <span>Fontes obrigatórias ativas</span>
                </div>

                {activeStructureCount > 0 && (
                  <div className="rounded-md bg-emerald-500/5 border border-emerald-500/15 px-2.5 py-2">
                    <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                      📐 {activeStructureCount}/{totalStructureCount} diretrizes editoriais ativas
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Definem a estrutura-base obrigatória do conteúdo gerado.
                    </p>
                  </div>
                )}

                {activeLibraryNames.length > 0 && (
                  <div className="rounded-md bg-blue-500/5 border border-blue-500/15 px-2.5 py-2">
                    <p className="text-[11px] font-medium text-blue-700 dark:text-blue-400">
                      📦 {activeLibraryNames.length} biblioteca(s) factual(ais)
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {activeLibraryNames.map(name => (
                        <li key={name} className="text-[10px] text-muted-foreground truncate">• {name}</li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {selectionMode === 'auto' ? '⚡ Automática' : selectionMode === 'manual' ? '✋ Manual' : '🔀 Combinada'}
                      </span>
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground/70 italic">
                  Em caso de conflito, as diretrizes editoriais vencem os campos do formulário.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
