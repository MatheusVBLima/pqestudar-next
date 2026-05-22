"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, ArrowRight, Search, Bookmark, BookmarkCheck, X } from "lucide-react";
import { usePremiumSavedItems } from "@/hooks/usePremiumSavedItems";
import { PageHero } from "@/components/layout/PageHero";
import { usePageSettings } from "@/hooks/usePageSettings";
import { cn } from "@/lib/utils";
import { isPremiumBenefit } from "@/lib/premium-benefits";
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

export default function PremiumCursosNext() {
  const [courses, setCourses] = useState<PremiumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { isSaved, toggleSave, isToggling } = usePremiumSavedItems();
  const ps = usePageSettings("/premium/cursos");
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

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("premium_items")
        .select("id, title, slug, description_short, logo_url, external_url, tags, status, sort_order")
        .eq("item_type", "course")
        .order("sort_order", { ascending: true });
      if (!isManagementMode) query = query.eq("status", "published");
      const { data, error } = await query;
      if (error) throw error;
      setCourses(((data || []) as PremiumItem[]).filter((item) => !isPremiumBenefit(item.tags)));
    } catch (err) {
      console.error("Error fetching courses:", err);
    } finally {
      setLoading(false);
    }
  }, [isManagementMode]);

  const handleSaved = (item: PremiumItemSaved) => {
    if (item.item_type !== "course") {
      fetchCourses();
      return;
    }
    setCourses((prev) => {
      const idx = prev.findIndex((c) => c.id === item.id);
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
    fetchCourses();
  }, [fetchCourses]);

  const allTags = Array.from(new Set(courses.flatMap((course) => course.tags || []))).sort();

  const filteredCourses = isManagementMode
    ? courses
    : courses.filter((course) => {
        const matchesSearch =
          !searchTerm ||
          course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.description_short?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTags =
          selectedTags.length === 0 || selectedTags.some((tag) => course.tags?.includes(tag));
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
  const sortableIds = useMemo(() => filteredCourses.map((c) => c.id), [filteredCourses]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = courses.findIndex((c) => c.id === active.id);
    const newIndex = courses.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(courses, oldIndex, newIndex);
    setCourses(next);
    await reorder(next.map((c) => c.id));
  };

  const handleTogglePublish = async (course: PremiumItem) => {
    const newStatus = await togglePublish({ id: course.id, title: course.title, status: course.status });
    if (newStatus) {
      setCourses((prev) => prev.map((c) => (c.id === course.id ? { ...c, status: newStatus } : c)));
    }
  };
  const handleDelete = async (course: PremiumItem) => {
    const ok = await remove({ id: course.id, title: course.title });
    if (ok) setCourses((prev) => prev.filter((c) => c.id !== course.id));
  };

  const renderCardContent = (course: PremiumItem) => (
    <Card className="flex flex-col h-full rounded-[1.2rem] border border-border bg-card shadow-card cursor-pointer transition-all hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {course.logo_url ? (
            <img src={course.logo_url} alt={course.title} className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
              {course.title}
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        {course.description_short && (
          <CardDescription className="line-clamp-3 mb-4">{course.description_short}</CardDescription>
        )}

        {course.tags && course.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {course.tags.slice(0, 3).map((tag) => (
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
                toggleSave(course.id, { title: course.title, slug: course.slug });
              }}
              disabled={isToggling(course.id)}
              aria-label={isSaved(course.id) ? "Remover dos salvos" : "Salvar curso"}
            >
              {isSaved(course.id) ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <PageHero
        title={ps.headerTitle || "Cursos **Curados** para Acelerar Sua Evolução"}
        description={ps.headerDescription || "Uma seleção criteriosa de cursos para você estudar o que realmente importa."}
      />

      <main className="w-full max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <ManagementToolbar
          createLabel="Novo curso"
          onCreate={openCreate}
          hint="Arraste para reordenar, edite ou despublique cards diretamente aqui."
        />
        <div className="mb-6">
          <PremiumBackButton fallbackPath="/premium" fallbackLabel="Premium" />
        </div>

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
                    placeholder="Buscar cursos..."
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

            {filteredCourses.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">
                  {courses.length === 0
                    ? "Nenhum curso disponível no momento."
                    : "Nenhum curso encontrado com os filtros atuais."}
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
                    {filteredCourses.map((course) => (
                      <ManageableCard
                        key={course.id}
                        id={course.id}
                        sortable
                        onEdit={() => openEdit(course.id)}
                        viewHref={`/premium/cursos/${course.slug}`}
                        isPublished={course.status === "published"}
                        onTogglePublish={() => handleTogglePublish(course)}
                        onDelete={() => handleDelete(course)}
                      >
                        {renderCardContent(course)}
                      </ManageableCard>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredCourses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/premium/cursos/${course.slug}`}
                    aria-label={`Ver detalhes de ${course.title}`}
                    className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[1.2rem]"
                  >
                    {renderCardContent(course)}
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
        defaultType="course"
        lockType
        onSaved={handleSaved}
      />
    </>
  );
}
