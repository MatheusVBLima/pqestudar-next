"use client";

import { PageHeader } from "@/components/admin/dashboard/PageHeader";
import ConcursosSearchConfig from "@/components/admin/ConcursosSearchConfig";

export default function AdminConcursosBusca() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Config. de Busca"
        description="Whitelist, blacklist, modo de busca e parâmetros de coleta."
      />
      <ConcursosSearchConfig />
    </div>
  );
}
