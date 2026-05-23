"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bookmark, BookmarkCheck, Eye, EyeOff, Gift, Search, Trash2, X } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { PageHero } from "@/components/layout/PageHero";
import { usePageSettings } from "@/hooks/usePageSettings";
import { usePremiumSavedItems } from "@/hooks/usePremiumSavedItems";
import { useManagementMode } from "@/hooks/useManagementMode";
import { usePremiumItemAdminActions } from "@/hooks/usePremiumItemAdminActions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { PREMIUM_BENEFIT_TAG, isPremiumBenefit, visiblePremiumTags } from "@/lib/premium-benefits";
import { ManagementToolbar } from "@/components/management/ManagementToolbar";
import { ManageableCard } from "@/components/management/ManageableCard";
import { PremiumBackButton } from "@/components/premium/PremiumBackButton";
import { PremiumItemEditDialog, type PremiumItemSaved } from "@/components/premium/PremiumItemEditDialog";

interface PremiumBenefit {
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

const BENEFIT_HIDDEN_TAGS = [PREMIUM_BENEFIT_TAG];

export default function PremiumBeneficiosNext() {
  const ps = usePageSettings("/premium/beneficios");
  const { isSaved, toggleSave, isToggling } = usePremiumSavedItems();
  const { isManagementMode } = useManagementMode();
  const { togglePublish, remove, reorder } = usePremiumItemAdminActions();
  const [benefits, setBenefits] = useState<PremiumBenefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchBenefits = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("premium_items")
        .select("id, title, slug, description_short, logo_url, external_url, tags, status, sort_order")
        .eq("item_type", "course")
        .contains("tags", [PREMIUM_BENEFIT_TAG])
        .order("sort_order", { ascending: true });
      if (!isManagementMode) query = query.eq("status", "published");
      const { data, error } = await query;
      if (error) throw error;
      setBenefits((data || []) as PremiumBenefit[]);
    } catch (err) {
      console.error("Error fetching benefits:", err);
    } finally {
      setLoading(false);
    }
  }, [isManagementMode]);

  useEffect(() => {
    fetchBenefits();
  }, [fetchBenefits]);

  useEffect(() => {
    if (!isManagementMode) setSelectedIds([]);
  }, [isManagementMode]);

  const openCreate = () => {
    setEditingId(null);
    setEditorOpen(true);
  };
  const openEdit = (id: string) => {
    setEditingId(id);
    setEditorOpen(true);
  };

  const handleSaved = (item: PremiumItemSaved) => {
    if (!isPremiumBenefit(item.tags)) {
      fetchBenefits();
      return;
    }
    const mapped: PremiumBenefit = {
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
    setBenefits((prev) => {
      const index = prev.findIndex((benefit) => benefit.id === item.id);
      if (index < 0) return [...prev, mapped];
      const next = [...prev];
      next[index] = mapped;
      return next;
    });
  };

  const allTags = Array.from(new Set(benefits.flatMap((benefit) => visiblePremiumTags(benefit.tags)))).sort();
  const filteredBenefits = isManagementMode
    ? benefits
    : benefits.filter((benefit) => {
        const tags = visiblePremiumTags(benefit.tags);
        const matchesSearch =
          !searchTerm ||
          benefit.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          benefit.description_short?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => tags.includes(tag));
        return matchesSearch && matchesTags;
      });

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]));
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTags([]);
  };
  const hasActiveFilters = searchTerm.length > 0 || selectedTags.length > 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const sortableIds = useMemo(() => filteredBenefits.map((benefit) => benefit.id), [filteredBenefits]);
  const visibleIds = useMemo(() => filteredBenefits.map((benefit) => benefit.id), [filteredBenefits]);
  const selectedVisibleCount = selectedIds.filter((id) => visibleIds.includes(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = benefits.findIndex((benefit) => benefit.id === active.id);
    const newIndex = benefits.findIndex((benefit) => benefit.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(benefits, oldIndex, newIndex);
    setBenefits(next);
    await reorder(next.map((benefit) => benefit.id));
  };

  const handleTogglePublish = async (benefit: PremiumBenefit) => {
    const status = await togglePublish({ id: benefit.id, title: benefit.title, status: benefit.status });
    if (status) setBenefits((prev) => prev.map((item) => (item.id === benefit.id ? { ...item, status } : item)));
  };
  const handleDelete = async (benefit: PremiumBenefit) => {
    const ok = await remove({ id: benefit.id, title: benefit.title });
    if (ok) {
      setBenefits((prev) => prev.filter((item) => item.id !== benefit.id));
      setSelectedIds((prev) => prev.filter((id) => id !== benefit.id));
    }
  };

  const handleSelectBenefit = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? Array.from(new Set([...prev, id])) : prev.filter((item) => item !== id)));
  };

  const handleToggleSelectVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      if (!checked) return prev.filter((id) => !visibleIds.includes(id));
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  const handleBulkDelete = async () => {
    const selectedBenefits = benefits.filter((benefit) => selectedIds.includes(benefit.id));
    if (selectedBenefits.length === 0) return;
    const ok = window.confirm(`Excluir ${selectedBenefits.length} benefício(s) selecionado(s)? Essa ação não pode ser desfeita.`);
    if (!ok) return;

    const ids = selectedBenefits.map((benefit) => benefit.id);
    const { error } = await supabase.from("premium_items").delete().in("id", ids);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }

    setBenefits((prev) => prev.filter((benefit) => !ids.includes(benefit.id)));
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    toast({ title: "Excluídos", description: `${ids.length} benefício(s) removido(s).` });
  };

  const handleBulkStatus = async (status: "draft" | "published") => {
    const selectedBenefits = benefits.filter((benefit) => selectedIds.includes(benefit.id));
    if (selectedBenefits.length === 0) return;

    const ids = selectedBenefits.map((benefit) => benefit.id);
    const { error } = await supabase
      .from("premium_items")
      .update({
        status,
        published_at: status === "published" ? new Date().toISOString() : null,
      })
      .in("id", ids);

    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      return;
    }

    setBenefits((prev) => prev.map((benefit) => (ids.includes(benefit.id) ? { ...benefit, status } : benefit)));
    toast({
      title: status === "published" ? "Publicados" : "Despublicados",
      description: `${ids.length} benefício(s) atualizado(s).`,
    });
  };

  const renderCardContent = (benefit: PremiumBenefit) => {
    const visibleTags = visiblePremiumTags(benefit.tags);
    return (
      <Card className="flex flex-col h-full rounded-[1.2rem] border border-border bg-card shadow-card cursor-pointer transition-all hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            {benefit.logo_url ? (
              <img src={benefit.logo_url} alt={benefit.title} className="h-12 w-12 rounded-lg object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                <Gift className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
              {benefit.title}
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col">
          {benefit.description_short && (
            <CardDescription className="line-clamp-3 mb-4">{benefit.description_short}</CardDescription>
          )}
          {visibleTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {visibleTags.slice(0, 3).map((tag) => (
                <span key={tag} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-background text-foreground border-border">
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
                  toggleSave(benefit.id, { title: benefit.title, slug: benefit.slug });
                }}
                disabled={isToggling(benefit.id)}
                aria-label={isSaved(benefit.id) ? "Remover dos salvos" : "Salvar benefício"}
              >
                {isSaved(benefit.id) ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <PageHero
        title={ps.headerTitle || "Benefícios **Premium** para Aproveitar Mais"}
        description={ps.headerDescription || "Cupons, acessos, vantagens e recursos selecionados para assinantes."}
      />

      <main className="w-full max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <ManagementToolbar
          createLabel="Novo benefício"
          onCreate={openCreate}
          hint="Arraste para reordenar, edite ou despublique benefícios diretamente aqui."
        />
        <div className="mb-6">
          <PremiumBackButton fallbackPath="/premium" fallbackLabel="Premium" />
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-64 rounded-[1.2rem]" />)}
          </div>
        ) : (
          <>
            {!isManagementMode && (
              <div className="mb-8 space-y-4">
                <div className="relative max-w-lg">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar benefícios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-full"
                  />
                </div>

                {allTags.length > 0 && (
                  <div className="flex items-center gap-3">
                    <nav aria-label="Filtrar por tag" className="flex-1 min-w-0 -mx-1 overflow-x-auto scrollbar-none overscroll-x-contain">
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
                      <button type="button" onClick={clearFilters} className="shrink-0 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <X className="h-3.5 w-3.5" />
                        Limpar
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {filteredBenefits.length === 0 ? (
              <div className="text-center py-16">
                <Gift className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">
                  {benefits.length === 0 ? "Nenhum benefício disponível no momento." : "Nenhum benefício encontrado com os filtros atuais."}
                </p>
              </div>
            ) : isManagementMode ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-border bg-card/80 px-4 py-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Checkbox
                      checked={allVisibleSelected}
                      onCheckedChange={(checked) => handleToggleSelectVisible(Boolean(checked))}
                      aria-label="Selecionar todos os benefícios visíveis"
                    />
                    Selecionar todos visíveis
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedIds.length} selecionado(s)
                    </span>
                    {selectedIds.length > 0 && (
                      <Button type="button" variant="outline" size="sm" onClick={() => setSelectedIds([])}>
                        Limpar seleção
                      </Button>
                    )}
                    <Button type="button" variant="outline" size="sm" onClick={() => handleBulkStatus("published")} disabled={selectedIds.length === 0}>
                      <Eye className="mr-1.5 h-4 w-4" />
                      Publicar selecionados
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleBulkStatus("draft")} disabled={selectedIds.length === 0}>
                      <EyeOff className="mr-1.5 h-4 w-4" />
                      Despublicar
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={handleBulkDelete} disabled={selectedIds.length === 0}>
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Excluir selecionados
                    </Button>
                  </div>
                </div>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {filteredBenefits.map((benefit) => (
                        <ManageableCard
                          key={benefit.id}
                          id={benefit.id}
                          sortable
                          selectable
                          selected={selectedIds.includes(benefit.id)}
                          onSelectedChange={(checked) => handleSelectBenefit(benefit.id, checked)}
                          onEdit={() => openEdit(benefit.id)}
                          viewHref={`/premium/beneficios/${benefit.slug}`}
                          isPublished={benefit.status === "published"}
                          onTogglePublish={() => handleTogglePublish(benefit)}
                          onDelete={() => handleDelete(benefit)}
                        >
                          {renderCardContent(benefit)}
                        </ManageableCard>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredBenefits.map((benefit) => (
                  <Link
                    key={benefit.id}
                    href={`/premium/beneficios/${benefit.slug}`}
                    aria-label={`Ver detalhes de ${benefit.title}`}
                    className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[1.2rem]"
                  >
                    {renderCardContent(benefit)}
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
        hiddenTags={BENEFIT_HIDDEN_TAGS}
        itemKindLabel="Novo benefício"
        detailBasePath="/premium/beneficios"
        onSaved={handleSaved}
      />
    </>
  );
}
