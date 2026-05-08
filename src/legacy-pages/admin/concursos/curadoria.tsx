"use client";

import { PageHeader } from "@/components/admin/dashboard/PageHeader";
import ConcursosCuradoria from "@/components/admin/ConcursosCuradoria";

export default function AdminConcursosCuradoria() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Curadoria"
        description="Revisar, aprovar ou rejeitar itens coletados antes da publicação."
      />
      <ConcursosCuradoria />
    </div>
  );
}
