"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ThumbsUp,
  Edit,
  Eye,
  EyeOff,
  Trash2,
  GripVertical,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import type { FeatureRequest } from "@/hooks/useFeatureRequests";

const UI_RADIUS = "rounded-[1.2rem]";

function SortableFeatureCard({
  feature,
  rank,
  onVote,
  onUnvote,
  onEdit,
  onToggle,
  onDelete,
  onComplete,
}: {
  feature: FeatureRequest;
  rank: number;
  onVote: (id: string) => void;
  onUnvote: (id: string) => void;
  onEdit: (feature: FeatureRequest) => void;
  onToggle: (feature: FeatureRequest) => void;
  onDelete: (feature: FeatureRequest) => void;
  onComplete: (feature: FeatureRequest) => void;
}) {
  const { user } = useAuth();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: feature.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group h-full">
      <div className={`border border-border bg-card flex flex-col h-full overflow-hidden transition-all duration-300 shadow-card hover:-translate-y-1 ${UI_RADIUS}`}>
        <div className="flex flex-col flex-1 p-4 gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className={`inline-flex items-center justify-center border border-border bg-muted text-foreground text-xs font-bold px-2.5 py-1 ${UI_RADIUS}`}>
              #{rank}
            </span>

            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-muted-foreground text-xs font-semibold">
                <ThumbsUp className="h-3.5 w-3.5" />
                {feature.votes_count}
              </span>

              {!feature.is_visible ? <Badge variant="secondary" className="text-xs">Oculta</Badge> : null}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div
                  {...attributes}
                  {...listeners}
                  className={`cursor-grab active:cursor-grabbing p-1.5 hover:bg-accent ${UI_RADIUS}`}
                >
                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <Button variant="ghost" size="sm" className={`h-7 w-7 p-0 hover:bg-accent ${UI_RADIUS}`} onClick={() => onEdit(feature)}>
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className={`h-7 w-7 p-0 hover:bg-accent ${UI_RADIUS}`} onClick={() => onToggle(feature)}>
                  {feature.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="sm" className={`h-7 w-7 p-0 hover:bg-accent ${UI_RADIUS}`} onClick={() => onComplete(feature)}>
                  <CheckCircle className="w-3.5 h-3.5 text-primary" />
                </Button>
                <Button variant="ghost" size="sm" className={`h-7 w-7 p-0 hover:bg-accent text-destructive hover:text-destructive ${UI_RADIUS}`} onClick={() => onDelete(feature)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-foreground mb-1.5">
              {feature.title}
            </h3>
            {feature.description ? (
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                {feature.description}
              </p>
            ) : null}
          </div>

          <div className="mt-auto">
            {user ? (
              <Button
                variant={feature.user_voted ? "default" : "outline"}
                size="sm"
                onClick={() => (feature.user_voted ? onUnvote(feature.id) : onVote(feature.id))}
                className={`w-full gap-2 text-sm ${UI_RADIUS}`}
              >
                <ThumbsUp className={`h-3.5 w-3.5 ${feature.user_voted ? "fill-current" : ""}`} />
                {feature.user_voted ? "Votado ✓" : "Votar"}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast({ title: "Faça login para votar" })}
                className={`w-full gap-2 text-sm ${UI_RADIUS}`}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                Votar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VotacoesManagementGrid({
  features,
  onReorder,
  onVote,
  onUnvote,
  onEdit,
  onToggle,
  onDelete,
  onComplete,
}: {
  features: FeatureRequest[];
  onReorder: (updates: Array<{ id: string; sort_order: number }>) => void;
  onVote: (id: string) => void;
  onUnvote: (id: string) => void;
  onEdit: (feature: FeatureRequest) => void;
  onToggle: (feature: FeatureRequest) => void;
  onDelete: (feature: FeatureRequest) => void;
  onComplete: (feature: FeatureRequest) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = features.findIndex((feature) => feature.id === active.id);
    const newIndex = features.findIndex((feature) => feature.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(features, oldIndex, newIndex);
    const updates = reordered.map((feature, index) => ({ id: feature.id, sort_order: index }));
    onReorder(updates);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={features.map((feature) => feature.id)} strategy={verticalListSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          <AnimatePresence mode="popLayout">
            {features.map((feature, index) => (
              <motion.div
                key={feature.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full"
              >
                <SortableFeatureCard
                  feature={feature}
                  rank={index + 1}
                  onVote={onVote}
                  onUnvote={onUnvote}
                  onEdit={onEdit}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onComplete={onComplete}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </SortableContext>
    </DndContext>
  );
}
