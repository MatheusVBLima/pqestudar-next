"use client";

import { AlertTriangle, CheckCircle2, CircleHelp, Info, ShieldCheck, UserRoundPen, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { BenefitCompatibilityResult, CompatibilityLevel, CriterionOutcome } from "@/lib/benefit-eligibility/types";
import { COMPATIBILITY_LABELS } from "@/lib/benefit-eligibility/presentation";
import { cn } from "@/lib/utils";

const LEVELS: Record<CompatibilityLevel, { label: string; className: string }> = {
  high: { label: COMPATIBILITY_LABELS.high, className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  possible: { label: COMPATIBILITY_LABELS.possible, className: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  needs_information: { label: COMPATIBILITY_LABELS.needs_information, className: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  low: { label: COMPATIBILITY_LABELS.low, className: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  unstructured: { label: COMPATIBILITY_LABELS.unstructured, className: "border-muted-foreground/25 bg-muted text-muted-foreground" },
};

const OUTCOME_ICON: Record<CriterionOutcome, typeof Info> = {
  match: CheckCircle2,
  mismatch: XCircle,
  unknown: AlertTriangle,
  not_applicable: Info,
};

export function CompatibilityBadge({ result }: { result: BenefitCompatibilityResult }) {
  const config = LEVELS[result.level];
  return <Badge variant="outline" className={cn("max-w-full truncate font-medium", config.className)}>{config.label}</Badge>;
}

export function CompatibilityExplanation({ result, onCompleteProfile }: { result: BenefitCompatibilityResult; onCompleteProfile?: () => void }) {
  const explanations = result.explanations;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline">
          <CircleHelp className="h-3.5 w-3.5" /> Por que apareceu para este perfil?
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(340px,calc(100vw-2rem))] space-y-3">
        <div>
          <p className="font-semibold">Análise para este perfil</p>
          <p className="mt-1 text-xs text-muted-foreground">Esta é uma indicação, não uma confirmação de direito ao benefício.</p>
        </div>
        {result.level === "unstructured" ? (
          <p className="text-sm text-muted-foreground">Os critérios deste benefício ainda não foram estruturados para análise automática.</p>
        ) : (
          <ul className="space-y-2">
            {result.coverage && <ExplanationItem outcome={result.coverage.outcome} message={result.coverage.message} />}
            {explanations.map((item) => <ExplanationItem key={item.criterionId} outcome={item.outcome} message={item.message} />)}
            {result.verificationExplanations.map((item) => (
              <li key={item.verificationId} className="flex items-start gap-2 text-sm">
                {item.outcome === "indeterminate"
                  ? <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                  : <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />}
                <span>{item.message}</span>
              </li>
            ))}
          </ul>
        )}
        {result.canCompleteProfile && onCompleteProfile && (
          <button type="button" onClick={onCompleteProfile} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
            <UserRoundPen className="h-3.5 w-3.5" /> Completar perfil
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function ExplanationItem({ outcome, message }: { outcome: CriterionOutcome; message: string }) {
  const Icon = OUTCOME_ICON[outcome];
  return <li className="flex items-start gap-2 text-sm"><Icon className={cn("mt-0.5 h-4 w-4 shrink-0", outcome === "match" && "text-emerald-500", outcome === "unknown" && "text-amber-500", outcome === "mismatch" && "text-rose-500")} /><span>{message}</span></li>;
}
