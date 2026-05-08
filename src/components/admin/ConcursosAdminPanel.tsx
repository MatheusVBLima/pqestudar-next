import { useState } from "react";
import { motion } from "framer-motion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Shield,
  Bot,
  ClipboardCheck,
  Settings,
  Database,
} from "lucide-react";
import ConcursosSearchConfig from "./ConcursosSearchConfig";
import ConcursosAntiRepetition from "./ConcursosAntiRepetition";
import ConcursosAIOrchestration from "./ConcursosAIOrchestration";
import ConcursosCuradoria from "./ConcursosCuradoria";
import ConcursosColeta from "./ConcursosColeta";
import ConcursosAdminErrorBoundary from "./ConcursosAdminErrorBoundary";
import { usePendingItems } from "@/hooks/useConcursosAdmin";

export default function ConcursosAdminPanel() {
  const [activeTab, setActiveTab] = useState("coleta");
  const { items } = usePendingItems("pending");
  const pendingCount = items.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 border rounded-lg bg-card"
    >
      <div className="p-4 border-b flex items-center gap-3">
        <Settings className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold text-lg">Painel Administrativo</h2>
        <Badge variant="outline" className="ml-auto">
          Admin
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto flex-wrap">
          <TabsTrigger
            value="coleta"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 gap-2"
          >
            <Database className="h-4 w-4" />
            Coleta
          </TabsTrigger>
          <TabsTrigger
            value="curadoria"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 gap-2"
          >
            <ClipboardCheck className="h-4 w-4" />
            Curadoria
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="busca"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 gap-2"
          >
            <Search className="h-4 w-4" />
            Config. de Busca
          </TabsTrigger>
          <TabsTrigger
            value="anti-repeticao"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 gap-2"
          >
            <Shield className="h-4 w-4" />
            Anti-Repetição
          </TabsTrigger>
          <TabsTrigger
            value="ia"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 gap-2"
          >
            <Bot className="h-4 w-4" />
            Orquestração IA
          </TabsTrigger>
        </TabsList>

        <ConcursosAdminErrorBoundary>
          <div className="p-4">
            <TabsContent value="coleta" className="mt-0">
              <ConcursosColeta />
            </TabsContent>

            <TabsContent value="curadoria" className="mt-0">
              <ConcursosCuradoria />
            </TabsContent>

            <TabsContent value="busca" className="mt-0">
              <ConcursosSearchConfig />
            </TabsContent>

            <TabsContent value="anti-repeticao" className="mt-0">
              <ConcursosAntiRepetition />
            </TabsContent>

            <TabsContent value="ia" className="mt-0">
              <ConcursosAIOrchestration />
            </TabsContent>
          </div>
        </ConcursosAdminErrorBoundary>
      </Tabs>
    </motion.div>
  );
}