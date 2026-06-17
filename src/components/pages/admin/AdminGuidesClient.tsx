"use client";

import { useMemo, useState } from "react";
import { BookOpen, Search } from "lucide-react";

import GuidesAdminView from "@/components/pages/GuidesAdminView";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGuidePublicCategories } from "@/hooks/useGuidePublicCategories";
import { type Guide, useGuides } from "@/hooks/useGuides";
import { cn } from "@/lib/utils";

export default function AdminGuidesClient() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { data: guides, isLoading } = useGuides(true);
  const { data: publicCategoriesRows } = useGuidePublicCategories();

  const publicCategories = useMemo(
    () => (publicCategoriesRows ?? []).map((category) => category.name),
    [publicCategoriesRows],
  );

  const filteredGuides = useMemo(() => {
    if (!guides) return [] as Guide[];

    let list = guides;
    const query = searchTerm.trim().toLowerCase();

    if (query) {
      list = list.filter((guide) =>
        [guide.title, guide.slug, guide.internal_code, guide.category, guide.public_category]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query)),
      );
    }

    if (categoryFilter !== "all") {
      list = list.filter((guide) => guide.public_category === categoryFilter);
    }

    return list;
  }, [categoryFilter, guides, searchTerm]);

  const publishedCount = guides?.filter((guide) => guide.is_published).length ?? 0;
  const draftCount = guides?.filter((guide) => !guide.is_published).length ?? 0;

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-primary">
          <BookOpen className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-[0.16em]">Conteúdo</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Guias</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie publicados e rascunhos. Use a prévia para ver como o guia ficará publicamente antes de publicar.
          </p>
        </div>
      </div>

      <section className="rounded-[var(--admin-radius)] border border-border/60 bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por título, slug, código ou categoria..."
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
              {publishedCount} publicados
            </span>
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
              {draftCount} rascunhos
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {[{ value: "all", label: "Todas" }, ...publicCategories.map((category) => ({ value: category, label: category }))].map((category) => {
            const active = categoryFilter === category.value;
            return (
              <button
                key={category.value}
                type="button"
                onClick={() => setCategoryFilter(category.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-[var(--admin-radius)]" />
          <Skeleton className="h-28 rounded-[var(--admin-radius)]" />
          <Skeleton className="h-28 rounded-[var(--admin-radius)]" />
        </div>
      ) : (
        <GuidesAdminView
          guides={guides}
          isLoading={false}
          filteredGuides={filteredGuides}
          forceToolbar
        />
      )}
    </div>
  );
}
