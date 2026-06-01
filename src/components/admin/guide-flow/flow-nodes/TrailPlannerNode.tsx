import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { ChevronDown, Link2, PencilLine, RefreshCw, Route, Table2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGuides } from '@/hooks/useGuides';
import { cn } from '@/lib/utils';
import {
  buildAllTrailCoverages,
  buildTrailCoverage,
  buildTrailRecommendation,
  getTrailSubjects,
  TRAIL_STAGES,
  type TrailStageStatus,
} from '@/lib/guide-trail-planner';
import type { GuideFlowInputs } from '../GuideFlowForm';

interface TrailPlannerNodeData {
  onApplyInputs?: (patch: Partial<GuideFlowInputs>) => void;
}

const STATUS_LABEL: Record<TrailStageStatus, string> = {
  published: 'Publicado',
  draft: 'Em produção',
  missing: 'Faltando',
};

const STATUS_CLASS: Record<TrailStageStatus, string> = {
  published: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
  draft: 'border-amber-500/30 bg-amber-500/10 text-amber-500',
  missing: 'border-border bg-muted/40 text-muted-foreground',
};

const FALLBACK_SUBJECTS = [
  'Cursos gratuitos',
  'Horas complementares',
  'Carteirinha de estudante',
  'Concurso público',
  'ENEM',
  'Currículo',
  'Inteligência artificial',
  'Benefícios sociais',
];

function recommendationPatch(recommendation: NonNullable<ReturnType<typeof buildTrailCoverage>['recommendation']>): Partial<GuideFlowInputs> {
  return {
    assuntoPrincipal: recommendation.subject,
    tema: recommendation.title,
    tipo: recommendation.stage,
    categoria: recommendation.internalCategory,
    categoriaPublica: recommendation.publicCategory,
    palavraChave: recommendation.keyword,
    intencao: recommendation.intent,
    contextoAdicional: recommendation.context,
  };
}

function SubjectSelect({
  value,
  subjects,
  onChange,
}: {
  value: string;
  subjects: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const options = useMemo(() => {
    const normalized = draft.trim().toLowerCase();
    const uniqueSubjects = Array.from(new Set([...subjects, ...FALLBACK_SUBJECTS]));
    return uniqueSubjects
      .filter((item) => item.toLowerCase().includes(normalized))
      .slice(0, 12);
  }, [draft, subjects]);

  const commitDraft = () => {
    const next = draft.trim();
    if (next) onChange(next);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="nodrag nopan relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-8 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-left text-xs ring-offset-background transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          open && "border-primary ring-2 ring-ring ring-offset-2"
        )}
      >
        <span className={cn("truncate", !value && "text-muted-foreground")}>
          {value || 'Ex: Cursos gratuitos'}
        </span>
        <ChevronDown className={cn("ml-2 h-3.5 w-3.5 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-[1000] w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md">
          <div className="border-b border-border p-1.5">
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitDraft();
                }
                if (event.key === 'Escape') {
                  setOpen(false);
                }
              }}
              placeholder="Buscar ou criar assunto..."
              className="h-8 rounded-md text-xs"
            />
          </div>

          <div className="max-h-52 overflow-y-auto p-1">
            {options.map((item) => {
              const isSelected = item === value;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex min-h-8 w-full items-center rounded-sm px-3 py-1.5 text-left text-xs outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    isSelected && "bg-accent text-accent-foreground"
                  )}
                >
                  <span className="truncate">{item}</span>
                </button>
              );
            })}

            {draft.trim() && !options.some((item) => item.toLowerCase() === draft.trim().toLowerCase()) && (
              <button
                type="button"
                onClick={commitDraft}
                className="flex min-h-8 w-full items-center rounded-sm px-3 py-1.5 text-left text-xs font-medium text-primary outline-none transition-colors hover:bg-accent focus:bg-accent"
              >
                Criar "{draft.trim()}"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TrailPlannerNodeComponent({ data }: { data: TrailPlannerNodeData }) {
  const { data: guides = [] } = useGuides(true);
  const [subject, setSubject] = useState('');
  const [showOverview, setShowOverview] = useState(false);

  const subjects = useMemo(() => getTrailSubjects(guides), [guides]);
  const activeSubject = subject.trim() || subjects[0] || 'Cursos gratuitos';
  const coverage = useMemo(() => buildTrailCoverage(guides, activeSubject), [guides, activeSubject]);
  const allCoverages = useMemo(() => buildAllTrailCoverages(guides), [guides]);

  const applyRecommendation = () => {
    if (!coverage.recommendation) return;
    data.onApplyInputs?.(recommendationPatch(coverage.recommendation));
  };

  const applyAlternative = () => {
    const next = coverage.missingStages.find((stage) => stage !== coverage.nextStage) ?? coverage.nextStage;
    if (!next) return;
    data.onApplyInputs?.(recommendationPatch(buildTrailRecommendation(coverage.subject, next, coverage.stages)));
  };

  return (
    <div className="w-[400px] overflow-visible rounded-[1.2rem] border-2 border-primary/35 bg-card shadow-card">
      <div className="flex items-center justify-between gap-2 border-b border-primary/20 bg-primary/10 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Planejador de Trilha</span>
        </div>
        <button
          type="button"
          onClick={() => setShowOverview((current) => !current)}
          className="nodrag nopan inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        >
          <Table2 className="h-2.5 w-2.5" />
          Geral
        </button>
      </div>

      <div className="space-y-3 p-4">
        <div className="space-y-1">
          <Label className="text-xs">Assunto principal</Label>
          <SubjectSelect value={activeSubject} subjects={subjects} onChange={setSubject} />
        </div>

        <div className="grid grid-cols-3 gap-1">
          {TRAIL_STAGES.map((stage) => {
            const status = coverage.stages[stage.value].status;
            return (
              <div key={stage.value} title={stage.description} className={cn("rounded-md border px-2 py-1", STATUS_CLASS[status])}>
                <div className="truncate text-[10px] font-semibold">{stage.label}</div>
                <div className="truncate text-[9px] opacity-80">{STATUS_LABEL[status]}</div>
              </div>
            );
          })}
        </div>

        <div className="rounded-md border border-border/60 bg-background/60 px-2 py-1.5">
          <p className="text-[10px] font-semibold">Integridade: {coverage.integrity}%</p>
          <p className="text-[9px] text-muted-foreground">
            {coverage.coveredCount} de 6 etapas
            {coverage.missingStages.length > 0
              ? ` · faltando ${coverage.missingStages.map((stage) => TRAIL_STAGES.find((item) => item.value === stage)?.label).join(', ')}`
              : ' · trilha completa'}
          </p>
        </div>

        {coverage.recommendation && (
          <div className="space-y-2 rounded-md border border-primary/20 bg-background/70 p-2">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">Próximo guia recomendado</p>
              <p className="text-xs font-semibold leading-snug">{coverage.recommendation.title}</p>
              <p className="text-[10px] text-muted-foreground">
                Etapa: {TRAIL_STAGES.find((stage) => stage.value === coverage.recommendation?.stage)?.label}
                {' · '}Palavra-chave: {coverage.recommendation.keyword}
              </p>
              <p className="text-[10px] leading-snug text-muted-foreground">{coverage.recommendation.reason}</p>
            </div>

            {coverage.recommendation.links.length > 0 && (
              <div className="space-y-1">
                <p className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                  <Link2 className="h-2.5 w-2.5" />
                  Links internos
                </p>
                {coverage.recommendation.links.map((link) => (
                  <p key={link.url} className="truncate text-[10px] text-muted-foreground">- {link.label}</p>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5">
              <Button type="button" size="sm" className="h-7 rounded-md text-[10px]" onClick={applyRecommendation}>
                Usar sugestão
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-7 rounded-md gap-1 text-[10px]" onClick={applyAlternative}>
                <RefreshCw className="h-2.5 w-2.5" />
                Outra
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-7 rounded-md gap-1 text-[10px]" onClick={() => data.onApplyInputs?.({ assuntoPrincipal: coverage.subject })}>
                <PencilLine className="h-2.5 w-2.5" />
                Manual
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-7 rounded-md text-[10px]" onClick={() => setShowOverview((current) => !current)}>
                Relacionados
              </Button>
            </div>
          </div>
        )}

        {showOverview && (
          <div className="max-h-44 overflow-y-auto rounded-md border border-border/60 bg-background/70">
            {allCoverages.map((item) => (
              <button
                key={item.subject}
                type="button"
                onClick={() => setSubject(item.subject)}
                className={cn(
                  "w-full space-y-1 border-b border-border/40 px-2 py-1.5 text-left last:border-b-0 hover:bg-muted/60",
                  item.subject === coverage.subject && "bg-primary/10"
                )}
              >
                <span className="grid grid-cols-[1fr_auto] gap-2">
                  <span className="min-w-0">
                    <span className="block truncate text-[10px] font-semibold">{item.subject}</span>
                    <span className="block truncate text-[9px] text-muted-foreground">
                      Próxima ação: {item.nextStage ? `criar ${TRAIL_STAGES.find((stage) => stage.value === item.nextStage)?.label}` : 'trilha completa'}
                    </span>
                  </span>
                  <span className="text-[10px] font-semibold text-primary">{item.integrity}%</span>
                </span>
                <span className="grid grid-cols-6 gap-1">
                  {TRAIL_STAGES.map((stage) => (
                    <span
                      key={stage.value}
                      title={`${stage.label}: ${STATUS_LABEL[item.stages[stage.value].status]}`}
                      className={cn("rounded border px-1 py-0.5 text-center text-[8px] font-semibold", STATUS_CLASS[item.stages[stage.value].status])}
                    >
                      {stage.label.slice(0, 3)}
                    </span>
                  ))}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-primary !h-3 !w-3 !border-2 !border-primary-foreground" />
    </div>
  );
}

export const TrailPlannerNode = memo(TrailPlannerNodeComponent);
