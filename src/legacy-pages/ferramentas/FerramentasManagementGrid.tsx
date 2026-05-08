import { useState } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Edit,
  Eye,
  EyeOff,
  GraduationCap,
  GripVertical,
  Shield,
  Sparkles,
  Star,
  Trash2,
  Wrench,
  Zap,
} from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tool } from "@/hooks/useTools";

const CATEGORY_ICONS: Record<string, any> = {
  "Inteligência Artificial": Brain,
  "Produtividade": Zap,
  "Segurança e Privacidade": Shield,
  "Cursos Gratuitos": GraduationCap,
  Utilidades: Wrench,
};

function isFeaturedActive(tool: Tool): boolean {
  if (!tool.is_featured) return false;
  if (tool.featured_indefinite) return true;
  const now = Date.now();
  const start = tool.featured_start ? new Date(tool.featured_start).getTime() : null;
  const end = tool.featured_end ? new Date(tool.featured_end).getTime() : null;
  if (start === null || end === null) return false;
  return now >= start && now <= end;
}

function SortableManagementToolCard({
  tool,
  onEdit,
  onToggleVisible,
  onDelete,
}: {
  tool: Tool;
  onEdit: (tool: Tool) => void;
  onToggleVisible: (id: string, isVisible: boolean) => void;
  onDelete: (tool: Tool) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tool.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = tool.tags[0] ? CATEGORY_ICONS[tool.tags[0]] || Sparkles : Sparkles;
  const featured = isFeaturedActive(tool);

  return (
    <div ref={setNodeRef} style={style} className="relative group h-full">
      <Card className={`h-full transition-all duration-300 flex flex-col ${featured ? "ring-2 ring-violet-500/60 shadow-md" : "transition-shadow hover:shadow-lg"}`}>
        <CardHeader>
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" data-testid="admin-actions">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded"
              aria-label="Arrastar para reordenar"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onEdit(tool)} aria-label="Editar ferramenta" data-evt="admin_edit">
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onToggleVisible(tool.id, tool.is_visible)}
              aria-label={tool.is_visible ? "Ocultar ferramenta" : "Exibir ferramenta"}
              data-evt={tool.is_visible ? "admin_hide" : "admin_show"}
            >
              {tool.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              onClick={() => onDelete(tool)}
              aria-label="Excluir ferramenta"
              data-evt="admin_delete"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-[auto,1fr] gap-4 items-center mb-2">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden border shadow-sm shrink-0">
              {tool.icon_url ? (
                <img
                  src={tool.icon_url}
                  alt={`Logo de ${tool.name}`}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = "block";
                  }}
                />
              ) : null}
              <Icon className="w-8 h-8 text-primary" aria-hidden="true" style={{ display: tool.icon_url ? "none" : "block" }} />
            </div>
            <CardTitle className="text-xl leading-tight flex flex-wrap items-center gap-2 mt-0">
              {tool.name}
              {featured ? (
                <Badge className="text-xs bg-amber-400 text-amber-950 border-amber-500 hover:bg-amber-400 gap-1 shrink-0">
                  <Star className="w-3 h-3 fill-amber-950" aria-hidden="true" />
                  Destaque
                </Badge>
              ) : null}
              {!tool.is_visible ? <Badge variant="secondary" className="text-xs">Oculta</Badge> : null}
              {tool.is_featured && !featured ? <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">Destaque inativo</Badge> : null}
            </CardTitle>
          </div>
          <CardDescription className="text-sm leading-relaxed flex-1">{tool.description}</CardDescription>
        </CardHeader>
        <CardContent className="mt-auto">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {tool.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            {tool.url ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-[1.2rem]"
                onClick={() => window.open(tool.url, "_blank", "noopener,noreferrer")}
                aria-label={`Abrir link externo de ${tool.name}`}
              >
                Link externo
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const copy = [...items];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy;
}

export default function FerramentasManagementGrid({
  tools,
  onReorder,
  onEdit,
  onToggleVisible,
  onDelete,
}: {
  tools: Tool[];
  onReorder: (nextTools: Tool[]) => void;
  onEdit: (tool: Tool) => void;
  onToggleVisible: (id: string, isVisible: boolean) => void;
  onDelete: (tool: Tool) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = tools.findIndex((tool) => tool.id === active.id);
    const newIndex = tools.findIndex((tool) => tool.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    onReorder(moveItem(tools, oldIndex, newIndex));
  };

  const activeTool = activeId ? tools.find((tool) => tool.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={tools.map((tool) => tool.id)} strategy={rectSortingStrategy}>
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {tools.map((tool) => (
            <SortableManagementToolCard
              key={tool.id}
              tool={tool}
              onEdit={onEdit}
              onToggleVisible={onToggleVisible}
              onDelete={onDelete}
            />
          ))}
        </motion.div>
      </SortableContext>

      <DragOverlay>
        {activeTool ? (
          <Card className="opacity-80">
            <CardHeader>
              <CardTitle>{activeTool.name}</CardTitle>
            </CardHeader>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
