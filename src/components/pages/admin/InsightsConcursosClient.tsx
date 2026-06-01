"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, MousePointerClick } from "lucide-react";

import InsightsConcursosEventosClient from "@/components/pages/admin/InsightsConcursosEventosClient";
import InsightsConcursosLeituraClient from "@/components/pages/admin/InsightsConcursosLeituraClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const VALID_TABS = ["leitura", "eventos"] as const;
type ConcursosTab = (typeof VALID_TABS)[number];

function getTab(value: string | null): ConcursosTab {
  return VALID_TABS.includes(value as ConcursosTab) ? (value as ConcursosTab) : "leitura";
}

export default function InsightsConcursosClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = getTab(searchParams.get("tab"));

  const handleTabChange = (value: string) => {
    router.replace(`/admin/insights/concursos?tab=${value}`, { scroll: false });
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="h-auto rounded-lg border border-border/70 bg-card/70 p-1">
          <TabsTrigger value="leitura" className="gap-2 rounded-md px-3 py-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" />
            Leitura
          </TabsTrigger>
          <TabsTrigger value="eventos" className="gap-2 rounded-md px-3 py-1.5 text-xs">
            <MousePointerClick className="h-3.5 w-3.5" />
            Eventos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leitura" className="mt-0">
          <InsightsConcursosLeituraClient />
        </TabsContent>
        <TabsContent value="eventos" className="mt-0">
          <InsightsConcursosEventosClient />
        </TabsContent>
      </Tabs>
    </div>
  );
}
