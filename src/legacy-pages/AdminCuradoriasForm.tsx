"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Globe,
  GripVertical,
  Loader2,
  Plus,
  Save,
  Search,
  Trophy,
  Wrench,
  X,
} from "lucide-react";
import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useUserRoles } from "@/hooks/useUserRoles";
import {
  CurationContentItem,
  useCheckSlugUnique,
  useCurationAutomationSources,
  useCurationById,
  useCurationMutations,
} from "@/hooks/useCurations";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function ItemTypeIcon({ type, className }: { type: CurationContentItem["type"]; className?: string }) {
  if (type === "contest") return <Trophy className={className} />;
  if (type === "guide") return <BookOpen className={className} />;
  return <Wrench className={className} />;
}

function itemTypeLabel(type: CurationContentItem["type"]) {
  if (type === "contest") return "Concurso";
  if (type === "guide") return "Guia";
  return "Ferramenta";
}

function SortableCurationItem({
  item,
  onRemove,
}: {
  item: CurationContentItem;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${item.type}:${item.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-3 p-3 bg-card border rounded-lg group"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded"
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
        ) : (
          <ItemTypeIcon type={item.type} className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{item.title}</p>
          <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
            {itemTypeLabel(item.type)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
        aria-label="Remover item"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function AdminCuradoriasForm() {
  const params = useParams<{ id?: string | string[] }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const router = useRouter();
  const isEditing = id && id !== "new";

  const { isAdmin, loading: loadingRoles } = useUserRoles();
  const { data: existingCuration, isLoading: loadingCuration } = useCurationById(isEditing ? id : "");
  const { data: allItems = [], isLoading: loadingItems } = useCurationAutomationSources();
  const { create, update } = useCurationMutations();
  const checkSlugUnique = useCheckSlugUnique();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [selectedItems, setSelectedItems] = useState<CurationContentItem[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [slugError, setSlugError] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!existingCuration) return;
    setTitle(existingCuration.title);
    setSlug(existingCuration.slug);
    setSlugManuallyEdited(true);
    setDescription(existingCuration.description || "");
    setSelectedItems(existingCuration.items.map((item) => item.content).filter(Boolean));
  }, [existingCuration]);

  const validateSlug = async (value: string) => {
    if (!value) {
      setSlugError("Slug e obrigatorio");
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(value)) {
      setSlugError("Slug deve conter apenas letras minusculas, numeros e hifens");
      return false;
    }
    const isUnique = await checkSlugUnique(value, isEditing ? id : undefined);
    if (!isUnique) {
      setSlugError("Ja existe uma curadoria com este slug");
      return false;
    }
    setSlugError("");
    return true;
  };

  const availableItems = useMemo(() => {
    const selectedIds = new Set(selectedItems.map((item) => `${item.type}:${item.id}`));
    const term = itemSearch.trim().toLowerCase();
    return allItems
      .filter((item) => !selectedIds.has(`${item.type}:${item.id}`))
      .filter((item) => {
        if (!term) return true;
        return [item.title, item.description, item.category, ...(item.tags ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term);
      });
  }, [allItems, itemSearch, selectedItems]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSelectedItems((items) => {
      const oldIndex = items.findIndex((item) => `${item.type}:${item.id}` === active.id);
      const newIndex = items.findIndex((item) => `${item.type}:${item.id}` === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugManuallyEdited) setSlug(slugify(value));
  };

  const handleSave = async (status: "draft" | "published") => {
    if (!title.trim()) return;

    const isValid = await validateSlug(slug);
    if (!isValid) return;

    const data = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim() || undefined,
      status,
      toolIds: selectedItems.filter((item) => item.type === "tool").map((item) => item.id),
      items: selectedItems.map((item) => ({ type: item.type, id: item.id })),
    };

    if (isEditing) {
      await update.mutateAsync({ id, ...data });
    } else {
      await create.mutateAsync(data);
    }

    router.push("/admin/curadorias");
  };

  const isSubmitting = create.isPending || update.isPending;

  if (loadingRoles || (isEditing && loadingCuration)) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-1/3 mb-8" />
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!loadingRoles && !isAdmin) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/curadorias")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">{isEditing ? "Editar Curadoria" : "Nova Curadoria"}</h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Titulo *</Label>
              <Input
                id="title"
                value={title}
                onChange={(event) => handleTitleChange(event.target.value)}
                placeholder="Ex: Ferramentas de IA para estudos"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/curadoria/</span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(event) => {
                    setSlug(event.target.value);
                    setSlugManuallyEdited(true);
                    setSlugError("");
                  }}
                  onBlur={() => validateSlug(slug)}
                  placeholder="ferramentas-ia-estudos"
                  className={slugError ? "border-destructive" : ""}
                />
              </div>
              {slugError && <p className="text-sm text-destructive">{slugError}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descricao</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Uma breve descricao desta curadoria..."
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">{description.length}/500 caracteres</p>
            </div>

            <div className="flex flex-wrap gap-3 pt-4">
              <Button variant="outline" onClick={() => handleSave("draft")} disabled={!title.trim() || isSubmitting}>
                {isSubmitting && create.variables?.status === "draft" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Salvar rascunho
              </Button>
              <Button onClick={() => handleSave("published")} disabled={!title.trim() || isSubmitting}>
                {isSubmitting && (create.variables?.status === "published" || update.variables?.status === "published") && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <Globe className="h-4 w-4 mr-2" />
                Publicar
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Itens da curadoria</CardTitle>
                <CardDescription>Busque ferramentas, concursos e guias do acervo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar no acervo..."
                    value={itemSearch}
                    onChange={(event) => setItemSearch(event.target.value)}
                    className="pl-10"
                  />
                </div>

                {loadingItems && <Skeleton className="h-28 w-full" />}

                {itemSearch && availableItems.length > 0 && (
                  <div className="max-h-56 overflow-y-auto border rounded-lg divide-y">
                    {availableItems.slice(0, 12).map((item) => (
                      <button
                        type="button"
                        key={`${item.type}:${item.id}`}
                        className="flex w-full items-center gap-3 p-2 text-left hover:bg-accent"
                        onClick={() => {
                          setSelectedItems((prev) => [...prev, item]);
                          setItemSearch("");
                        }}
                      >
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                          ) : (
                            <ItemTypeIcon type={item.type} className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{itemTypeLabel(item.type)}</p>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}

                {itemSearch && availableItems.length === 0 && !loadingItems && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum item encontrado.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Selecionados ({selectedItems.length})</CardTitle>
                <CardDescription>Arraste para reordenar. A meta ideal e ter 3 itens por curadoria.</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p>Nenhum item adicionado.</p>
                    <p className="text-sm">Busque acima para adicionar.</p>
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={selectedItems.map((item) => `${item.type}:${item.id}`)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {selectedItems.map((item) => (
                          <SortableCurationItem
                            key={`${item.type}:${item.id}`}
                            item={item}
                            onRemove={() =>
                              setSelectedItems((prev) => prev.filter((selected) => `${selected.type}:${selected.id}` !== `${item.type}:${item.id}`))
                            }
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
