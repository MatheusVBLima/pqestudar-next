"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Database,
  ClipboardCheck,
  Search,
  Shield,
  Bot,
  History,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/dashboard/PageHeader";
import { usePendingItems } from "@/hooks/useConcursosAdmin";
import { Badge } from "@/components/ui/badge";

const modules = [
  {
    title: "Coleta",
    description: "Entrada de dados brutos antes da IA. Executa Crawler, Busca e Manual.",
    icon: Database,
    href: "/admin/concursos/coleta",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    title: "Curadoria",
    description: "Revisar, aprovar e rejeitar itens pendentes de curadoria manual.",
    icon: ClipboardCheck,
    href: "/admin/concursos/curadoria",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    hasPending: true,
  },
  {
    title: "Config. de Busca",
    description: "Whitelist/blacklist de sites, modo de busca e parâmetros de coleta.",
    icon: Search,
    href: "/admin/concursos/busca",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    title: "Anti-Repetição",
    description: "Regras para evitar conteúdo duplicado antes de chamar a IA.",
    icon: Shield,
    href: "/admin/concursos/anti-repeticao",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    title: "Orquestração IA",
    description: "Motor de IA, funções habilitadas, prompt base e limites de execução.",
    icon: Bot,
    href: "/admin/concursos/orquestracao-ia",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  {
    title: "Histórico",
    description: "Execuções de coleta anteriores com drill-down e possibilidade de reexecutar.",
    icon: History,
    href: "/admin/concursos/historico",
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
];

export default function AdminConcursosIndex() {
  const { items: pendingItems } = usePendingItems("pending");
  const pendingCount = pendingItems.length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Concursos"
        description="Central de gerenciamento do módulo de concursos e oportunidades."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {modules.map((mod, i) => (
          <motion.div
            key={mod.href}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className={`p-2 rounded-lg ${mod.bg} shrink-0`}>
                    <mod.icon className={`h-5 w-5 ${mod.color}`} />
                  </div>
                  {mod.hasPending && pendingCount > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base mt-3">{mod.title}</CardTitle>
                <CardDescription className="text-sm">{mod.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm" className="w-full gap-2">
                  <Link href={mod.href}>
                    Acessar
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
