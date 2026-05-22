"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, ArrowRight, Search, Bookmark, BookmarkCheck, X } from "lucide-react";
import { usePremiumSavedItems } from "@/hooks/usePremiumSavedItems";
import { PageHero } from "@/components/layout/PageHero";
import { usePageSettings } from "@/hooks/usePageSettings";
import { cn } from "@/lib/utils";
import { useManagementMode } from "@/hooks/useManagementMode";
import { ManagementToolbar } from "@/components/management/ManagementToolbar";
import { ManageableCard } from "@/components/management/ManageableCard";
import { usePremiumItemAdminActions } from "@/hooks/usePremiumItemAdminActions";
import { PremiumItemEditDialog, type PremiumItemSaved } from "@/components/premium/PremiumItemEditDialog";
import { PremiumBackButton } from "@/components/premium/PremiumBackButton";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

interface PremiumItem {
  id: string;
  title: string;
  slug: string;
  description_short: string | null;
  logo_url: string | null;
  external_url: string | null;
  tags: string[];
  status?: string;
  sort_order?: number;
}

export default function PremiumVagasNext() {
  const [jobs, setJobs] = useState<PremiumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { isSaved, toggleSave, isToggling } = usePremiumSavedItems();
  const ps = usePageSettings("/premium/vagas");
  const { isManagementMode } = useManagementMode();
  const { togglePublish, remove, reorder } = usePremiumItemAdminActions();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setEditorOpen(true);
  };
  const openEdit = (id: string) => {
    setEditingId(id);
    setEditorOpen(true);
  };

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("premium_items")
        .select("id, title, slug, description_short, logo_url, external_url, tags, status, sort_order")
        .eq("item_type", "job")
        .order("sort_order", { ascending: true });
      if (!isManagementMode) query = query.eq("status", "published");
      const { data, error } = await query;
      if (error) throw error;
      setJobs((data || []) as PremiumItem[]);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setLoading(false);
    }
  }, [isManagementMode]);

  const handleSaved = (item: PremiumItemSaved) => {
    if (item.item_type !== "job") {
      fetchJobs();
      return;
    }
    setJobs((prev) => {
      const idx = prev.findIndex((j) => j.id === item.id);
      const mapped: PremiumItem = {
        id: item.id,
        title: item.title,
        slug: item.slug,
        description_short: item.description_short,
        logo_url: item.logo_url,
        external_url: item.external_url,
        tags: item.tags,
        status: item.status,
        sort_order: item.sort_order,
      };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = mapped;
        return next;
      }
      return [...prev, mapped];
    });
  };

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const allTags = Array.from(new Set(jobs.flatMap((j) => j.tags || []))).sort();

  const filteredJobs = isManagementMode
    ? jobs
    : jobs.filter((j) => {
        const matchesSearch =
          !searchTerm ||
          j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          j.description_short?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTags =
          selectedTags.length === 0 || selectedTags.some((tag) => j.tags?.includes(tag));
        return matchesSearch && matchesTags;
      });

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTags([]);
  };
  const hasActiveFilters = searchTerm.length > 0 || selectedTags.length > 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const sortableIds = useMemo(() => filteredJobs.map((j) => j.id), [filteredJobs]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = jobs.findIndex((j) => j.id === active.id);
    const newIndex = jobs.findIndex((j) => j.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(jobs, oldIndex, newIndex);
    setJobs(next);
    await reorder(next.map((j) => j.id));
  };

  const handleTogglePublish = async (job: PremiumItem) => {
    const newStatus = await togglePublish({ id: job.id, title: job.title, status: job.status });
    if (newStatus) {
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: newStatus } : j)));
    }
  };
  const handleDelete = async (job: PremiumItem) => {
    const ok = await remove({ id: job.id, title: job.title });
    if (ok) setJobs((prev) => prev.filter((j) => j.id !== job.id));
  };

  const renderCardContent = (job: PremiumItem) => (
    <Card className="flex flex-col h-full rounded-[1.2rem] border border-border bg-card shadow-card cursor-pointer transition-all hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {job.logo_url ? (
            <img src={job.logo_url} alt={job.title} className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
              {job.title}
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        {job.description_short && (
          <CardDescription className="line-clamp-3 mb-4">{job.description_short}</CardDescription>
        )}

        {job.tags && job.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {job.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-background text-foreground border-border"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2 mt-auto">
          <Button size="sm" className="flex-1 pointer-events-none" tabIndex={-1}>
            Ver detalhes
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          {!isManagementMode && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleSave(job.id, { title: job.title, slug: job.slug });
              }}
              disabled={isToggling(job.id)}
              aria-label={isSaved(job.id) ? "Remover dos salvos" : "Salvar vaga"}
            >
              {isSaved(job.id) ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <PageHero
        title={ps.headerTitle || "Vagas **Selecionadas** para Você Crescer"}
        description={ps.headerDescription || "Curadoria exclusiva de oportunidades de trabalho e estágio."}
      />

      <main className="w-full max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="mb-6">
          <PremiumBackButton fallbackPath="/premium" fallbackLabel="Premium" />
        </div>
        <ManagementToolbar
          createLabel="Nova vaga"
          onCreate={openCreate}
          hint="Arraste para reordenar, edite ou despublique cards diretamente aqui."
        />

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-64 rounded-[1.2rem]" />
            ))}
          </div>
        ) : (
          <>
            {!isManagementMode && (
              <div className="mb-8 space-y-4">
                <div className="relative max-w-lg">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar vagas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-full"
                  />
                </div>

                {allTags.length > 0 && (
                  <div className="flex items-center gap-3">
                    <nav
                      aria-label="Filtrar por tag"
                      className="flex-1 min-w-0 -mx-1 overflow-x-auto scrollbar-none overscroll-x-contain"
                    >
                      <ul className="flex items-center gap-1.5 px-1 whitespace-nowrap">
                        {allTags.map((tag) => {
                          const active = selectedTags.includes(tag);
                          return (
                            <li key={tag} className="shrink-0">
                              <button
                                type="button"
                                onClick={() => toggleTag(tag)}
                                aria-pressed={active}
                                className={cn(
                                  "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                                  active
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground",
                                )}
                              >
                                {tag}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </nav>

                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="shrink-0 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                        Limpar
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {filteredJobs.length === 0 ? (
              <div className="text-center py-16">
                <Briefcase className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">
                  {jobs.length === 0
                    ? "Nenhuma vaga disponível no momento."
                    : "Nenhuma vaga encontrada com os filtros atuais."}
                </p>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-4">
                    Limpar filtros
                  </Button>
                )}
              </div>
            ) : isManagementMode ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredJobs.map((job) => (
                      <ManageableCard
                        key={job.id}
                        id={job.id}
                        sortable
                        onEdit={() => openEdit(job.id)}
                        viewHref={`/premium/vagas/${job.slug}`}
                        isPublished={job.status === "published"}
                        onTogglePublish={() => handleTogglePublish(job)}
                        onDelete={() => handleDelete(job)}
                      >
                        {renderCardContent(job)}
                      </ManageableCard>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/premium/vagas/${job.slug}`}
                    aria-label={`Ver detalhes de ${job.title}`}
                    className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[1.2rem]"
                  >
                    {renderCardContent(job)}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <PremiumItemEditDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        itemId={editingId}
        defaultType="job"
        lockType
        onSaved={handleSaved}
      />
    </>
  );
}
