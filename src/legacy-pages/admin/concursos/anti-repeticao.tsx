"use client";

import { PageHeader } from "@/components/admin/dashboard/PageHeader";
import ConcursosAntiRepetition from "@/components/admin/ConcursosAntiRepetition";

export default function AdminConcursosAntiRepeticao() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Anti-Repetição"
        description="Regras para evitar conteúdo duplicado antes de acionar a IA."
      />
      <ConcursosAntiRepetition />
    </div>
  );
}
