"use client";

import { useMemo } from "react";
import GuidesAdminView from "@/components/pages/GuidesAdminView";
import { useGuides } from "@/hooks/useGuides";

export default function ModeratorGuidesClient() {
  const { data: guides, isLoading } = useGuides(true);
  const filtered = useMemo(() => guides ?? [], [guides]);
  return <div className="space-y-5"><header><h1 className="text-2xl font-bold tracking-tight">Gerenciar guias</h1><p className="mt-1 text-sm text-muted-foreground">Crie, publique e mantenha os conteúdos sob sua responsabilidade.</p></header><GuidesAdminView guides={guides} filteredGuides={filtered} isLoading={isLoading} forceToolbar /></div>;
}
