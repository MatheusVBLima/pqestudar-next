import type { BenefitCompatibilityResult, CompatibilityLevel } from "./types";

export const COMPATIBILITY_LABELS: Record<CompatibilityLevel, string> = {
  high: "Alta compatibilidade",
  possible: "Pode ser compatível",
  needs_information: "Faltam informações",
  low: "Pouca compatibilidade",
  unstructured: "Critérios ainda não estruturados",
};

export function visibleCompatibility(active: boolean, result: BenefitCompatibilityResult): BenefitCompatibilityResult | null {
  return active ? result : null;
}

export function compatibilityExplanationMessages(result: BenefitCompatibilityResult): string[] {
  if (result.level === "unstructured") {
    return ["Os critérios deste benefício ainda não foram estruturados para análise automática."];
  }
  return [result.coverage?.message, ...result.explanations.map((item) => item.message)].filter((message): message is string => !!message);
}
