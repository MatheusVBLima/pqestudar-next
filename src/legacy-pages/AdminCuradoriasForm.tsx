"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Globe,
  Search,
  Plus,
  X,
  GripVertical,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useTools, Tool } from "@/hooks/useTools";
import {
  useCurationById,
  useCurationMutations,
  useCheckSlugUnique,
} from "@/hooks/useCurations";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Slugify helper
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

// Sortable item component
function SortableToolItem({
  tool,
  onRemove,
}: {
  tool: Tool;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tool.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
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
        {tool.icon_url ? (
          <img
            src={tool.icon_url}
            alt={tool.name}
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-5 h-5 bg-primary/10 rounded-full" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{tool.name}</p>
        <p className="text-xs text-muted-foreground truncate">{tool.description}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
        aria-label="Remover ferramenta"
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
  const { data: existingCuration, isLoading: loadingCuration } = useCurationById(
    isEditing ? id : ""
  );
  const { tools: allTools, loading: loadingTools } = useTools({ includeInvisible: true });
  const { create, update } = useCurationMutations();
  const checkSlugUnique = useCheckSlugUnique();

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [selectedTools, setSelectedTools] = useState<Tool[]>([]);
  const [toolSearch, setToolSearch] = useState("");
  const [slugError, setSlugError] = useState("");

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize form with existing data
  useEffect(() => {
    if (existingCuration) {
      setTitle(existingCuration.title);
      setSlug(existingCuration.slug);
      setSlugManuallyEdited(true);
      setDescription(existingCuration.description || "");
      setSelectedTools(
        existingCuration.items.map((item) => item.tool as Tool).filter(Boolean)
      );
    }
  }, [existingCuration]);

  // Validate slug uniqueness
  const validateSlug = async (value: string) => {
    if (!value) {
      setSlugError("Slug é obrigatório");
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(value)) {
      setSlugError("Slug deve conter apenas letras minúsculas, números e hífens");
      return false;
    }
    const isUnique = await checkSlugUnique(value, isEditing ? id : undefined);
    if (!isUnique) {
      setSlugError("Já existe uma curadoria com este slug");
      return false;
    }
    setSlugError("");
    return true;
  };

  // Filter available tools
  const availableTools = useMemo(() => {
    const selectedIds = new Set(selectedTools.map((t) => t.id));
    return allTools
      .filter((t) => !selectedIds.has(t.id))
      .filter(
        (t) =>
          !toolSearch ||
          t.name.toLowerCase().includes(toolSearch.toLowerCase()) ||
          t.description.toLowerCase().includes(toolSearch.toLowerCase())
      );
  }, [allTools, selectedTools, toolSearch]);

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSelectedTools((items) => {
        const oldIndex = items.findIndex((t) => t.id === active.id);
        const newIndex = items.findIndex((t) => t.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Add tool
  const addTool = (tool: Tool) => {
    setSelectedTools((prev) => [...prev, tool]);
    setToolSearch("");
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugManuallyEdited) {
      setSlug(slugify(value));
    }
  };

  // Remove tool
  const removeTool = (toolId: string) => {
    setSelectedTools((prev) => prev.filter((t) => t.id !== toolId));
  };

  // Save handlers
  const handleSave = async (status: "draft" | "published") => {
    if (!title.trim()) {
      return;
    }

    const isValid = await validateSlug(slug);
    if (!isValid) return;

    const data = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim() || undefined,
      status,
      toolIds: selectedTools.map((t) => t.id),
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/curadorias")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">
            {isEditing ? "Editar Curadoria" : "Nova Curadoria"}
          </h1>
        </div>

        {/* Form */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Column 1: Form fields */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Ex: Ferramentas de IA para Estudos"
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
                  onChange={(e) => {
                    setSlug(e.target.value);
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
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Uma breve descrição desta curadoria..."
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/500 caracteres
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => handleSave("draft")}
                disabled={!title.trim() || isSubmitting}
              >
                {isSubmitting && create.variables?.status === "draft" && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <Save className="h-4 w-4 mr-2" />
                Salvar rascunho
              </Button>
              <Button
                onClick={() => handleSave("published")}
                disabled={!title.trim() || isSubmitting}
              >
                {isSubmitting && (create.variables?.status === "published" || update.variables?.status === "published") && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <Globe className="h-4 w-4 mr-2" />
                Publicar
              </Button>
            </div>
          </div>

          {/* Column 2: Tool selector & preview */}
          <div className="space-y-6">
            {/* Tool search */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Ferramentas</CardTitle>
                <CardDescription>
                  Busque e adicione ferramentas a esta curadoria.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar ferramentas..."
                    value={toolSearch}
                    onChange={(e) => setToolSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Available tools dropdown */}
                {toolSearch && availableTools.length > 0 && (
                  <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                    {availableTools.slice(0, 10).map((tool) => (
                      <div
                        key={tool.id}
                        className="flex items-center gap-3 p-2 hover:bg-accent cursor-pointer"
                        onClick={() => addTool(tool)}
                      >
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {tool.icon_url ? (
                            <img
                              src={tool.icon_url}
                              alt={tool.name}
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-4 h-4 bg-primary/10 rounded-full" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{tool.name}</p>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )}

                {toolSearch && availableTools.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma ferramenta encontrada.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Selected tools */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Ferramentas selecionadas ({selectedTools.length})
                  </CardTitle>
                </div>
                <CardDescription>
                  Arraste para reordenar. Esta será a ordem exibida na página.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedTools.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p>Nenhuma ferramenta adicionada.</p>
                    <p className="text-sm">Busque acima para adicionar.</p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={selectedTools.map((t) => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {selectedTools.map((tool) => (
                          <SortableToolItem
                            key={tool.id}
                            tool={tool}
                            onRemove={() => removeTool(tool.id)}
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
