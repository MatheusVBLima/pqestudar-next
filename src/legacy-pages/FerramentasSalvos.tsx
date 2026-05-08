"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHero } from "@/components/layout/PageHero";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useSavedItems } from "@/hooks/useSavedItems";
import { SavedAccordion } from "@/components/saved/SavedAccordion";
import { SavedToolsPanel } from "@/components/saved/SavedToolsPanel";
import { SavedContestsPanel } from "@/components/saved/SavedContestsPanel";
import { usePageSettings } from "@/hooks/usePageSettings";
export default function FerramentasSalvos() {
  const ps = usePageSettings("/ferramentas/salvos");
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?from=ferramentas-salvos");
    }
  }, [authLoading, user, router]);
  const { savedItems, loading, fetchSavedItems, getSavedByType } = useSavedItems();
  
  // Lazy load triggers
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [contestsExpanded, setContestsExpanded] = useState(false);

  // Fetch saved items when component mounts
  useEffect(() => {
    if (user) {
      fetchSavedItems();
    }
  }, [user, fetchSavedItems]);

  const savedTools = getSavedByType('tool');
  const savedContests = getSavedByType('contest');

  const handleToolsExpand = useCallback(() => {
    setToolsExpanded(true);
  }, []);

  const handleContestsExpand = useCallback(() => {
    setContestsExpanded(true);
  }, []);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1">
          <PageHero title={ps.headerTitle} description={ps.headerDescription} />
          <section className="pt-12 md:pt-16 pb-24 px-4 sm:px-6 lg:px-8">
            <div className="container max-w-5xl mx-auto space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-5 rounded" />
                      <Skeleton className="h-5 w-40" />
                    </div>
                    <Skeleton className="h-5 w-5" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  // User not authenticated — redirect handled by useEffect; render nothing meanwhile
  if (!user) {
    return null;
  }

  return (
    <>
      <div className="min-h-screen flex flex-col bg-background">

        <main className="flex-1">
          <PageHero title={ps.headerTitle} description={ps.headerDescription} isLoading={ps.isLoading} />

          {/* Accordion Sections */}
          <section className="pt-12 md:pt-16 pb-24 px-4 sm:px-6 lg:px-8">
            <div className="container max-w-5xl mx-auto">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="rounded-lg border bg-card p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-5 w-5 rounded" />
                          <Skeleton className="h-5 w-40" />
                        </div>
                        <Skeleton className="h-5 w-5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <SavedAccordion
                  toolsCount={savedTools.length}
                  contestsCount={savedContests.length}
                  toolsContent={
                    <SavedToolsPanel
                      savedItems={savedTools}
                      onRefresh={fetchSavedItems}
                      shouldLoad={toolsExpanded}
                    />
                  }
                  contestsContent={
                    <SavedContestsPanel
                      savedItems={savedContests}
                      onRefresh={fetchSavedItems}
                      shouldLoad={contestsExpanded}
                    />
                  }
                  toolsLoading={false}
                  contestsLoading={false}
                  onToolsExpand={handleToolsExpand}
                  onContestsExpand={handleContestsExpand}
                />
              )}
            </div>
          </section>
        </main>

        
      </div>
    </>
  );
}
