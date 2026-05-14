"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePremiumSavedItems } from "@/hooks/usePremiumSavedItems";
import { PageHero } from "@/components/layout/PageHero";
import { usePageSettings } from "@/hooks/usePageSettings";
import { PremiumRail } from "@/components/premium/PremiumRail";
import { CourseRailCard } from "@/components/premium/cards/CourseRailCard";
import { JobRailCard } from "@/components/premium/cards/JobRailCard";
import { PremiumBackButton } from "@/components/premium/PremiumBackButton";

interface SavedItem {
  id: string;
  item_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface PremiumItemDetails {
  id: string;
  title: string;
  slug: string;
  description_short: string | null;
  logo_url: string | null;
  external_url: string | null;
  tags: string[];
  item_type: string;
}

export default function PremiumSalvosNext() {
  const ps = usePageSettings("/premium/salvos");
  const { user } = useAuth();
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [itemDetails, setItemDetails] = useState<Map<string, PremiumItemDetails>>(new Map());
  const [loading, setLoading] = useState(true);
  const { toggleSave, isToggling, isSaved } = usePremiumSavedItems();

  useEffect(() => {
    if (!user) return;
    const fetchSavedItems = async () => {
      try {
        const { data: savedData, error: savedError } = await supabase
          .from("saved_items")
          .select("id, item_id, metadata, created_at")
          .eq("user_id", user.id)
          .eq("item_type", "premium_item")
          .order("created_at", { ascending: false });

        if (savedError) throw savedError;
        setSavedItems((savedData || []) as SavedItem[]);

        if (savedData && savedData.length > 0) {
          const itemIds = savedData.map((s) => s.item_id);
          const { data: detailsData, error: detailsError } = await supabase
            .from("premium_items")
            .select("id, title, slug, description_short, logo_url, external_url, tags, item_type")
            .in("id", itemIds);

          if (detailsError) throw detailsError;

          const detailsMap = new Map<string, PremiumItemDetails>();
          detailsData?.forEach((item) => {
            detailsMap.set(item.id, item as PremiumItemDetails);
          });
          setItemDetails(detailsMap);
        }
      } catch (err) {
        console.error("Error fetching saved items:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSavedItems();
  }, [user]);

  const handleToggleSave = async (itemId: string) => {
    const success = await toggleSave(itemId);
    if (success) {
      setSavedItems((prev) => prev.filter((item) => item.item_id !== itemId));
    }
  };

  const savedCourses = savedItems
    .filter((s) => itemDetails.get(s.item_id)?.item_type === "course")
    .map((s) => itemDetails.get(s.item_id))
    .filter(Boolean) as PremiumItemDetails[];

  const savedJobs = savedItems
    .filter((s) => itemDetails.get(s.item_id)?.item_type === "job")
    .map((s) => itemDetails.get(s.item_id))
    .filter(Boolean) as PremiumItemDetails[];

  const hasAnySaved = !loading && savedItems.length > 0;
  const hasCourses = savedCourses.length > 0;
  const hasJobs = savedJobs.length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1">
        <PageHero
          title={ps.headerTitle}
          description={ps.headerDescription}
          isLoading={ps.isLoading}
        />

        <div className="w-full max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14 space-y-10 md:space-y-12">
          <PremiumBackButton fallbackPath="/premium" fallbackLabel="Premium" />

          {loading ? (
            <>
              <PremiumRail
                title="Cursos Salvos"
                subtitle="Sua seleção de cursos salvos"
                isLoading
                skeletonCount={3}
              />
              <PremiumRail
                title="Vagas Salvas"
                subtitle="Suas vagas salvas"
                isLoading
                skeletonCount={3}
              />
            </>
          ) : !hasAnySaved ? (
            <div className="text-center py-12 rounded-[1.2rem] border border-border bg-card/80">
              <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Você ainda não salvou nenhum item.
              </p>
              <div className="flex gap-4 justify-center">
                <Button asChild variant="outline">
                  <Link href="/premium/cursos">Ver cursos</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/premium/vagas">Ver vagas</Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              {hasCourses && (
                <PremiumRail
                  title="Cursos Salvos"
                  subtitle="Sua seleção de cursos salvos"
                  viewMoreHref="/premium/cursos"
                  viewMoreLabel="Explorar cursos"
                  isLoading={false}
                  isEmpty={false}
                >
                  {savedCourses.map((c) => (
                    <CourseRailCard
                      key={c.id}
                      id={c.id}
                      title={c.title}
                      slug={c.slug}
                      description={c.description_short}
                      tags={c.tags}
                      isSaved={isSaved(c.id)}
                      isToggling={isToggling(c.id)}
                      onToggleSave={() => handleToggleSave(c.id)}
                    />
                  ))}
                </PremiumRail>
              )}

              {hasJobs && (
                <PremiumRail
                  title="Vagas Salvas"
                  subtitle="Suas vagas salvas"
                  viewMoreHref="/premium/vagas"
                  viewMoreLabel="Explorar vagas"
                  isLoading={false}
                  isEmpty={false}
                >
                  {savedJobs.map((j) => (
                    <JobRailCard
                      key={j.id}
                      id={j.id}
                      title={j.title}
                      slug={j.slug}
                      description={j.description_short}
                      tags={j.tags}
                      isSaved={isSaved(j.id)}
                      isToggling={isToggling(j.id)}
                      onToggleSave={() => handleToggleSave(j.id)}
                    />
                  ))}
                </PremiumRail>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
