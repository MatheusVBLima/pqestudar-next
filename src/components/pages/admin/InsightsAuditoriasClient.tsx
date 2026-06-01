"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Search } from "lucide-react";

import InsightsCopyAuditClient from "@/components/pages/admin/InsightsCopyAuditClient";
import InsightsSeoAuditClient from "@/components/pages/admin/InsightsSeoAuditClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const VALID_TABS = ["seo", "copy"] as const;
type AuditoriasTab = (typeof VALID_TABS)[number];

function getTab(value: string | null): AuditoriasTab {
  return VALID_TABS.includes(value as AuditoriasTab) ? (value as AuditoriasTab) : "seo";
}

export default function InsightsAuditoriasClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = getTab(searchParams.get("tab"));

  const handleTabChange = (value: string) => {
    router.replace(`/admin/insights/auditorias?tab=${value}`, { scroll: false });
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="h-auto rounded-lg border border-border/70 bg-card/70 p-1">
          <TabsTrigger value="seo" className="gap-2 rounded-md px-3 py-1.5 text-xs">
            <Search className="h-3.5 w-3.5" />
            SEO
          </TabsTrigger>
          <TabsTrigger value="copy" className="gap-2 rounded-md px-3 py-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            Copy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="seo" className="mt-0">
          <InsightsSeoAuditClient />
        </TabsContent>
        <TabsContent value="copy" className="mt-0">
          <InsightsCopyAuditClient />
        </TabsContent>
      </Tabs>
    </div>
  );
}
