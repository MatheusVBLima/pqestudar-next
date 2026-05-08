"use client";

import { PageHeader } from "@/components/admin/dashboard/PageHeader";
import ConcursosAIOrchestration from "@/components/admin/ConcursosAIOrchestration";

export default function AdminConcursosOrquestracaoIA() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Orquestração IA"
        description="Motor de IA, funções habilitadas, prompt base e limites de execução."
      />
      <ConcursosAIOrchestration />
    </div>
  );
}
