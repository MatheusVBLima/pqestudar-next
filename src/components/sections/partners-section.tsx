import { devLog } from '@/lib/dev-log';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { useUserRoles } from "@/hooks/useUserRoles";
import { usePartners, Partner } from "@/hooks/usePartners";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Eye, EyeOff, Trash2, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PartnerModal } from "@/components/admin/PartnerModal";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PartnerFormData = Omit<Partner, "id" | "created_at" | "updated_at" | "created_by" | "updated_by">;
type PartnerStatusFilter = "all" | "active" | "inactive";

// Componente de card sortable
function SortablePartnerCard({ 
  partner, 
  isAdmin, 
  handleEdit, 
  toggleActive, 
  setDeletePartner 
}: { 
  partner: Partner; 
  isAdmin: boolean; 
  handleEdit: (p: Partner) => void; 
  toggleActive: (id: string, state: boolean) => void; 
  setDeletePartner: (p: Partner) => void; 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: partner.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const initials = partner.title
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="relative group"
    >
      <div
        className="flex flex-col items-center space-y-2 min-w-[80px] sm:min-w-[100px] cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <div className="relative">
          <GripVertical className="absolute -top-2 -left-2 w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
          
          <Avatar className="h-12 w-12 sm:h-16 sm:w-16 ring-2 ring-border/50 group-hover:ring-primary/50 transition-all duration-300 shadow-lg">
            <AvatarImage 
              src={partner.logo_url} 
              alt={`${partner.title} logo`}
              className="object-cover"
            />
            <AvatarFallback className="bg-gradient-primary text-white font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          {!partner.is_active && (
            <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
              Oculto
            </span>
          )}
        </div>

        <span className="text-xs sm:text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
          {partner.title}
        </span>
      </div>

      {/* Ações Admin */}
      {isAdmin && (
        <div className="flex gap-1 justify-center mt-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEdit(partner)}
            className="h-8 w-8 p-0"
          >
            <Edit className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => toggleActive(partner.id, partner.is_active)}
            className="h-8 w-8 p-0"
          >
            {partner.is_active ? (
              <EyeOff className="w-3 h-3" />
            ) : (
              <Eye className="w-3 h-3" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDeletePartner(partner)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function PartnersSection() {
  const { isAdmin, loading: loadingRoles } = useUserRoles();
  const [managementMode, setManagementMode] = useState(false);
  const [filterStatus, setFilterStatus] = useState<PartnerStatusFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [deletePartner, setDeletePartner] = useState<Partner | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const { 
    partners, 
    loading, 
    addPartner, 
    updatePartner, 
    deletePartner: removePartner,
    toggleActive,
    reorderPartners
  } = usePartners(managementMode);

  // Sensores para drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredPartners = partners.filter(partner => {
    if (filterStatus === 'active') return partner.is_active;
    if (filterStatus === 'inactive') return !partner.is_active;
    return true;
  });

  const handleSave = async (data: PartnerFormData) => {
    if (editingPartner) {
      await updatePartner(editingPartner.id, data);
    } else {
      await addPartner(data);
    }
    setEditingPartner(null);
  };

  const handleDelete = async () => {
    if (deletePartner) {
      await removePartner(deletePartner.id);
      setDeletePartner(null);
    }
  };

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingPartner(null);
    setModalOpen(true);
  };

  const handleDragStart = (event: DragStartEvent) => {
    devLog('[Drag] Start', { activeId: event.active.id });
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    devLog('[Drag] End', {
      activeId: active.id, 
      overId: over?.id,
      activeIndex: filteredPartners.findIndex(p => p.id === active.id),
      overIndex: over ? filteredPartners.findIndex(p => p.id === over.id) : -1
    });

    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = filteredPartners.findIndex((p) => p.id === active.id);
    const newIndex = filteredPartners.findIndex((p) => p.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(filteredPartners, oldIndex, newIndex);
      
      // Salvar com debounce
      setIsSaving(true);
      setTimeout(async () => {
        await reorderPartners(reordered);
        setIsSaving(false);
      }, 500);
    }
  };

  // Duplicar parceiros para movimento contínuo
  const displayPartners = managementMode 
    ? filteredPartners 
    : [...filteredPartners, ...filteredPartners, ...filteredPartners, ...filteredPartners];

  const activePartner = activeId ? partners.find(p => p.id === activeId) : null;

  return (
    <section className="py-12 bg-background border-t border-border/50 w-full">
      <div className="container mx-auto px-4 max-w-7xl w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Parceiros de Confiança
            </h2>
            <p className="text-muted-foreground">
              Conectados com as melhores plataformas educacionais
            </p>
          </div>

          {isAdmin && !loadingRoles && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Modo de Gerenciamento
              </span>
              <Switch
                checked={managementMode}
                onCheckedChange={setManagementMode}
              />
            </div>
          )}
        </div>

        {/* Painel Admin */}
        {managementMode && isAdmin && (
          <div className="mb-8 p-4 bg-muted/50 rounded-lg border border-border">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={handleAdd}
                  size="sm"
                  className="min-h-[44px]"
                  disabled={isSaving}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Parceiro
                </Button>

                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as PartnerStatusFilter)}>
                  <SelectTrigger className="w-[180px] min-h-[44px]">
                    <SelectValue placeholder="Filtrar status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Ocultos</SelectItem>
                  </SelectContent>
                </Select>

                {isSaving && (
                  <Badge variant="secondary" className="animate-pulse">
                    Salvando ordem...
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs">
                  <GripVertical className="w-3 h-3 mr-1" />
                  Arraste para reordenar
                </Badge>
                <div className="text-sm text-muted-foreground">
                  {filteredPartners.length} parceiro(s)
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 py-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rounded-xl border bg-card p-4 space-y-3">
                <Skeleton className="mx-auto h-16 w-16 rounded-full" />
                <Skeleton className="mx-auto h-4 w-24" />
                <Skeleton className="mx-auto h-3 w-16" />
              </div>
            ))}
          </div>
        ) : displayPartners.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-lg text-muted-foreground mb-2">
              Nenhum parceiro encontrado
            </p>
            <p className="text-sm text-muted-foreground/70">
              {managementMode 
                ? "Adicione novos parceiros para começar." 
                : "Estamos trabalhando em novas parcerias."}
            </p>
          </div>
        ) : managementMode ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div 
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
              role="region"
              aria-live="polite"
              aria-label="Lista de parceiros - use as setas do teclado para reordenar"
            >
              <SortableContext
                items={filteredPartners.map(p => p.id)}
                strategy={rectSortingStrategy}
              >
                {filteredPartners.map((partner) => (
                  <SortablePartnerCard
                    key={partner.id}
                    partner={partner}
                    isAdmin={isAdmin}
                    handleEdit={handleEdit}
                    toggleActive={toggleActive}
                    setDeletePartner={setDeletePartner}
                  />
                ))}
              </SortableContext>
            </div>
            <DragOverlay>
              {activePartner ? (
                <div className="relative opacity-90">
                  <Avatar className="h-16 w-16 ring-2 ring-primary shadow-2xl">
                    <AvatarImage src={activePartner.logo_url} alt={activePartner.title} />
                    <AvatarFallback className="bg-gradient-primary text-white font-semibold">
                      {activePartner.title.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="relative w-full overflow-hidden py-4">
            <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            
            <div 
              className="flex animate-scroll-right group-hover:pause-animation w-max"
              style={{ width: 'max-content' }}
            >
              {displayPartners.map((partner, index) => {
                const initials = partner.title
                  .split(' ')
                  .map(word => word[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <div 
                    key={`${partner.id}-${index}`} 
                    className="flex-shrink-0 px-2 sm:px-4 group relative z-0 hover:z-50"
                    onMouseEnter={(e) => {
                      const scrollElement = e.currentTarget.closest('.animate-scroll-right') as HTMLElement;
                      if (scrollElement) scrollElement.style.animationPlayState = 'paused';
                    }}
                    onMouseLeave={(e) => {
                      const scrollElement = e.currentTarget.closest('.animate-scroll-right') as HTMLElement;
                      if (scrollElement) scrollElement.style.animationPlayState = 'running';
                    }}
                  >
                    <a
                      href={partner.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center space-y-2 min-w-[80px] sm:min-w-[100px] group transition-all duration-300"
                    >
                      <div className="relative">
                        <Avatar className="h-12 w-12 sm:h-16 sm:w-16 ring-2 ring-border/50 group-hover:ring-primary/50 group-hover:scale-110 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                          <AvatarImage 
                            src={partner.logo_url} 
                            alt={`${partner.title} logo`}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-gradient-primary text-white font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <span className="text-xs sm:text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
                        {partner.title}
                      </span>
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal CRUD */}
      <PartnerModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditingPartner(null);
        }}
        partner={editingPartner}
        onSave={handleSave}
      />

      {/* Dialog Confirmação Delete */}
      <AlertDialog open={!!deletePartner} onOpenChange={() => setDeletePartner(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o parceiro <strong>{deletePartner?.title}</strong>? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="min-h-[44px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
