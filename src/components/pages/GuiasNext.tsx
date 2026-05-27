"use client";

import { lazy, Suspense, useMemo, useState } from "react";
import { Search, BookOpen } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";
import { Skeleton } from "@/components/ui/skeleton";
import { FeaturedGuideCard } from "@/components/guides/FeaturedGuideCard";
import { GuideListItem } from "@/components/guides/GuideListItem";
import { GuideSearchOverlay } from "@/components/guides/GuideSearchOverlay";
import { useGuidePublicCategories } from "@/hooks/useGuidePublicCategories";
import { useGuides, Guide } from "@/hooks/useGuides";
import { useManagementMode } from "@/hooks/useManagementMode";
import { usePageSettings } from "@/hooks/usePageSettings";
import { useUserRoles } from "@/hooks/useUserRoles";
import { cn } from "@/lib/utils";

const GuidesAdminView = lazy(() => import("@/components/pages/GuidesAdminView"));

const noopAdminActions = {
  onEdit: (_guide: Guide) => {},
  onDelete: (_guide: Guide) => {},
  onTogglePublished: (_guide: Guide) => {},
  onToggleFeatured: (_guide: Guide) => {},
};

function GuidesList({
  guides,
  showAdmin,
  adminActions,
  showFeatured,
}: {
  guides: Guide[];
  showAdmin: boolean;
  adminActions: {
    onEdit: (g: Guide) => void;
    onDelete: (g: Guide) => void;
    onTogglePublished: (g: Guide) => void;
    onToggleFeatured: (g: Guide) => void;
  };
  showFeatured: boolean;
}) {
  const { featuredGuide, listGuides } = useMemo(() => {
    if (!guides.length) return { featuredGuide: null, listGuides: [] as Guide[] };

    if (!showFeatured) {
      const sorted = [...guides].sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
      return { featuredGuide: null, listGuides: sorted };
    }

    const featuredCandidates = guides
      .filter((g) => g.is_featured)
      .sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

    const featured =
      featuredCandidates[0] ??
      [...guides].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )[0] ??
      null;

    const rest = guides
      .filter((g) => g.id !== featured?.id)
      .sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

    return { featuredGuide: featured, listGuides: rest };
  }, [guides, showFeatured]);

  if (guides.length === 0) {
    return (
      <div className="py-16 text-center">
        <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
        <p className="text-lg text-muted-foreground">Nenhum guia encontrado.</p>
      </div>
    );
  }

  return (
    <>
      {featuredGuide && (
        <FeaturedGuideCard guide={featuredGuide} showAdmin={showAdmin} {...adminActions} />
      )}
      {listGuides.length > 0 && (
        <div className="space-y-4">
          {listGuides.map((guide) => (
            <GuideListItem
              key={guide.id}
              guide={guide}
              showAdmin={showAdmin}
              {...adminActions}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function GuiasNext() {
  const ps = usePageSettings("/guias");
  const { isAdmin } = useUserRoles();
  const { isManagementMode } = useManagementMode();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const showAdmin = isAdmin && isManagementMode;
  const { data: guides, isLoading } = useGuides(showAdmin);

  const { data: publicCategoriesRows } = useGuidePublicCategories();
  const publicCategories = (publicCategoriesRows ?? []).map((c) => c.name);

  const publicGuides = useMemo(() => {
    if (!guides) return [] as Guide[];
    return guides.filter((g) => g.is_published);
  }, [guides]);

  const filtered = useMemo(() => {
    if (!guides) return [] as Guide[];
    let list = guides;

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter((g) => g.title.toLowerCase().includes(lower));
    }

    if (categoryFilter !== "all") {
      list = list.filter((g) => g.public_category === categoryFilter);
    }

    return list;
  }, [guides, searchTerm, categoryFilter]);

  const renderPublicContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-64 rounded-[1.2rem]" />
          <Skeleton className="h-24 rounded-[1.2rem]" />
          <Skeleton className="h-24 rounded-[1.2rem]" />
        </div>
      );
    }

    return (
      <GuidesList
        guides={filtered}
        showAdmin={false}
        adminActions={noopAdminActions}
        showFeatured
      />
    );
  };

  return (
    <>
      <PageHero
        title={ps.headerTitle || "Guias"}
        description={
          ps.headerDescription ||
          "Conteudos praticos e evergreen para estudar com mais clareza e aproveitar oportunidades."
        }
      />

      <main className="w-full max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 pb-16">
        <div className="mb-8 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <nav
              aria-label="Filtrar por categoria"
              className="flex-1 min-w-0 -mx-1 overflow-x-auto scrollbar-none overscroll-x-contain"
            >
              <ul className="flex items-center gap-1.5 px-1 whitespace-nowrap">
                {[{ value: "all", label: "Todas" }, ...publicCategories.map((c) => ({ value: c, label: c }))].map((cat) => {
                  const active = categoryFilter === cat.value;
                  return (
                    <li key={cat.value} className="shrink-0">
                      <button
                        type="button"
                        onClick={() => setCategoryFilter(cat.value)}
                        aria-pressed={active}
                        className={cn(
                          "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        {cat.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Abrir busca de guias"
              className="shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-full border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </div>

        {showAdmin ? (
          <Suspense fallback={<Skeleton className="h-64 rounded-[1.2rem]" />}>
            <GuidesAdminView guides={guides} isLoading={isLoading} filteredGuides={filtered} />
          </Suspense>
        ) : (
          renderPublicContent()
        )}
      </main>

      <GuideSearchOverlay
        open={searchOpen}
        onOpenChange={(o) => {
          setSearchOpen(o);
          if (!o) setSearchTerm("");
        }}
        guides={publicGuides}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />
    </>
  );
}
