"use client";

import { useMemo } from "react";
import GuidesAdminView from "@/components/pages/GuidesAdminView";
import { useGuides } from "@/hooks/useGuides";

export default function ModeratorGuidesClient() {
  const { data: guides, isLoading } = useGuides(true);
  const filtered = useMemo(() => guides ?? [], [guides]);
  return <GuidesAdminView guides={guides} filteredGuides={filtered} isLoading={isLoading} forceToolbar />;
}
