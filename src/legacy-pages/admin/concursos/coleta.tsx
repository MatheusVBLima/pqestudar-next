"use client";

import { PageHeader } from "@/components/admin/dashboard/PageHeader";
import ConcursosColeta from "@/components/admin/ConcursosColeta";

export default function AdminConcursosColeta() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Coleta de Dados"
        description="Entrada de dados brutos antes da IA. Executa Crawler, Busca Simples ou Manual."
      />
      <ConcursosColeta />
    </div>
  );
}
