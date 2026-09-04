"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { eligibilityCriterionFromRow, eligibilityVerificationFromRow } from "@/lib/benefit-eligibility/criteria-mapper";
import type { BenefitEligibilityCriterion, BenefitEligibilityVerification } from "@/lib/benefit-eligibility/types";

export function useBenefitEligibilityCriteria(benefitIds: string[], enabled: boolean) {
  const stableIds = useMemo(() => [...new Set(benefitIds)].sort(), [benefitIds]);
  const idsKey = stableIds.join(",");
  const [criteria, setCriteria] = useState<BenefitEligibilityCriterion[]>([]);
  const [verifications, setVerifications] = useState<BenefitEligibilityVerification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!enabled) {
      setCriteria([]);
      setVerifications([]);
      setLoading(false);
      setError(null);
      setLoadedKey(null);
      return () => { active = false; };
    }
    if (stableIds.length === 0) {
      setCriteria([]);
      setVerifications([]);
      setLoading(false);
      setError(null);
      setLoadedKey(idsKey);
      return () => { active = false; };
    }
    setLoading(true);
    setError(null);
    setLoadedKey(null);
    void Promise.all([
      supabase.from("benefit_eligibility_criteria").select("*").in("benefit_id", stableIds).eq("is_active", true),
      supabase.from("benefit_eligibility_verifications").select("*").in("benefit_id", stableIds).eq("is_active", true),
    ]).then(([criteriaResult, verificationResult]) => {
        if (!active) return;
        if (criteriaResult.error || verificationResult.error) {
          setCriteria([]);
          setVerifications([]);
          setError("Não foi possível analisar a compatibilidade agora. Tente novamente.");
        } else {
          setCriteria((criteriaResult.data ?? []).map(eligibilityCriterionFromRow));
          setVerifications((verificationResult.data ?? []).map(eligibilityVerificationFromRow));
        }
        setLoading(false);
        setLoadedKey(idsKey);
      });
    return () => { active = false; };
  // idsKey expresses collection identity without refetching for an equivalent array.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, idsKey]);

  const ready = enabled && loadedKey === idsKey;
  return {
    criteria,
    verifications,
    loading: enabled && (loading || !ready),
    error: ready ? error : null,
    ready,
  };
}
