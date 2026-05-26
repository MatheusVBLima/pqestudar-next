"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GripVertical, Plus, Pencil, Trash2, Save, Image, Monitor, Tablet, Smartphone } from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error-message";

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string | null;
  order_index: number;
  is_active: boolean;
  is_external: boolean;
  open_in_new_tab: boolean;
  show_icon_desktop: boolean;
  show_icon_tablet: boolean;
  show_icon_mobile: boolean;
}

interface NavSettings {
  id: string;
  logo_light_url: string;
  logo_dark_url: string;
}

type NavSettingsInsert = TablesInsert<"nav_settings">;
type NavSettingsUpdate = TablesUpdate<"nav_settings">;
type NavItemUpdate = TablesUpdate<"nav_items">;
type NavItemInsert = TablesInsert<"nav_items">;

// ─── Sortable Row ───
function SortableNavItem({
  item, onEdit, onDelete, onToggle, onIconToggle,
}: {
  item: NavItem;
  onEdit: (item: NavItem) => void;
  onDelete: (item: NavItem) => void;
  onToggle: (item: NavItem) => void;
  onIconToggle: (item: NavItem, field: 'show_icon_desktop' | 'show_icon_tablet' | 'show_icon_mobile') => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const iconBreakpoints: { field: 'show_icon_desktop' | 'show_icon_tablet' | 'show_icon_mobile'; icon: typeof Monitor; label: string }[] = [
    { field: 'show_icon_desktop', icon: Monitor, label: 'Desktop' },
    { field: 'show_icon_tablet', icon: Tablet, label: 'Tablet' },
    { field: 'show_icon_mobile', icon: Smartphone, label: 'Mobile' },
  ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-card p-3 transition-shadow",
        isDragging && "shadow-lg ring-2 ring-primary/30 z-10"
      )}
    >
      <div className="flex items-center gap-3">
        <button {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground hover:text-foreground" aria-label="Reordenar">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{item.label}</p>
          <p className="text-xs text-muted-foreground truncate">{item.href}</p>
        </div>
        <Switch checked={item.is_active} onCheckedChange={() => onToggle(item)} aria-label="Ativo" />
        <Button variant="ghost" size="icon" onClick={() => onEdit(item)} aria-label="Editar">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(item)} className="text-destructive hover:text-destructive" aria-label="Excluir">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {item.icon && (
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-3 pl-7">
            <span className="text-xs text-muted-foreground">Ícone:</span>
            {iconBreakpoints.map(({ field, icon: BpIcon, label }) => (
              <Tooltip key={field}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onIconToggle(item, field)}
                    className={cn(
                      "flex items-center gap-1 rounded-md px-1.5 py-1 text-xs transition-colors",
                      item[field]
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                    aria-label={`${label}: ícone ${item[field] ? 'visível' : 'oculto'}`}
                  >
                    <BpIcon className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {label}: ícone {item[field] ? 'visível' : 'oculto'}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}

// ─── Page ───
export default function AdminMenu() {
  const qc = useQueryClient();

  // ── Fetch nav_settings ──
  const settingsQuery = useQuery({
    queryKey: ["admin-nav-settings"],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      const { data, error } = await supabase.from("nav_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data as NavSettings | null;
    },
  });

  // ── Fetch nav_items ──
  const itemsQuery = useQuery({
    queryKey: ["admin-nav-items"],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      const { data, error } = await supabase.from("nav_items").select("*").order("order_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as NavItem[];
    },
  });

  // ── Logo form state ──
  const [logoDraft, setLogoDraft] = useState<{ light?: string; dark?: string }>({});
  const logoLight = logoDraft.light ?? settingsQuery.data?.logo_light_url ?? "";
  const logoDark = logoDraft.dark ?? settingsQuery.data?.logo_dark_url ?? "";

  const saveLogo = useMutation({
    mutationFn: async () => {
      if (!settingsQuery.data) {
        const payload: NavSettingsInsert = { logo_light_url: logoLight, logo_dark_url: logoDark };
        const { error } = await supabase.from("nav_settings").insert(payload);
        if (error) throw error;
      } else {
        const payload: NavSettingsUpdate = { logo_light_url: logoLight, logo_dark_url: logoDark };
        const { error } = await supabase.from("nav_settings").update(payload).eq("id", settingsQuery.data.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Logos atualizadas!");
      setLogoDraft({});
      qc.invalidateQueries({ queryKey: ["admin-nav-settings"] });
      qc.invalidateQueries({ queryKey: ["nav-settings-public"] });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Erro ao salvar logos")),
  });

  // ── Items state ──
  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);

  // ── DnD ──
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIdx = items.findIndex((i) => i.id === active.id);
      const newIdx = items.findIndex((i) => i.id === over.id);
      const previousItems = items;
      const reordered = arrayMove(items, oldIdx, newIdx).map((it, idx) => ({ ...it, order_index: idx }));
      qc.setQueryData(["admin-nav-items"], reordered);
      // Batch update order
      const updates = reordered.map((it) =>
        supabase.from("nav_items").update({ order_index: it.order_index } satisfies NavItemUpdate).eq("id", it.id)
      );
      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed?.error) {
        qc.setQueryData(["admin-nav-items"], previousItems);
        toast.error("Erro ao reordenar");
      } else {
        qc.invalidateQueries({ queryKey: ["admin-nav-items"] });
        qc.invalidateQueries({ queryKey: ["nav-items-public"] });
      }
    },
    [items, qc]
  );

  // ── Toggle ──
  const toggleItem = useCallback(
    async (item: NavItem) => {
      const newActive = !item.is_active;
      const previousItems = items;
      qc.setQueryData<NavItem[]>(["admin-nav-items"], (prev = []) =>
        prev.map((entry) => (entry.id === item.id ? { ...entry, is_active: newActive } : entry))
      );
      const payload: NavItemUpdate = { is_active: newActive };
      const { error } = await supabase.from("nav_items").update(payload).eq("id", item.id);
      if (error) {
        qc.setQueryData(["admin-nav-items"], previousItems);
        toast.error("Erro ao alternar item");
      } else {
        qc.invalidateQueries({ queryKey: ["admin-nav-items"] });
        qc.invalidateQueries({ queryKey: ["nav-items-public"] });
      }
    },
    [items, qc]
  );

  // ── Icon breakpoint toggle ──
  const toggleIconBreakpoint = useCallback(
    async (item: NavItem, field: 'show_icon_desktop' | 'show_icon_tablet' | 'show_icon_mobile') => {
      const newValue = !item[field];
      const previousItems = items;
      qc.setQueryData<NavItem[]>(["admin-nav-items"], (prev = []) =>
        prev.map((entry) => (entry.id === item.id ? { ...entry, [field]: newValue } : entry))
      );
      const payload: NavItemUpdate = { [field]: newValue };
      const { error } = await supabase.from("nav_items").update(payload).eq("id", item.id);
      if (error) {
        qc.setQueryData(["admin-nav-items"], previousItems);
        toast.error("Erro ao alterar visibilidade do ícone");
      } else {
        qc.invalidateQueries({ queryKey: ["admin-nav-items"] });
        qc.invalidateQueries({ queryKey: ["nav-items-public"] });
      }
    },
    [items, qc]
  );

  // ── CRUD modal ──
  const [editItem, setEditItem] = useState<NavItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLabel, setFormLabel] = useState("");
  const [formHref, setFormHref] = useState("");
  const [formIcon, setFormIcon] = useState("");

  const openCreate = () => {
    setEditItem(null);
    setFormLabel("");
    setFormHref("");
    setFormIcon("");
    setIsModalOpen(true);
  };
  const openEdit = (item: NavItem) => {
    setEditItem(item);
    setFormLabel(item.label);
    setFormHref(item.href);
    setFormIcon(item.icon ?? "");
    setIsModalOpen(true);
  };

  const saveItem = useMutation({
    mutationFn: async () => {
      if (!formLabel.trim() || !formHref.trim()) throw new Error("Label e href são obrigatórios");
      if (editItem) {
        const payload: NavItemUpdate = {
          label: formLabel.trim(),
          href: formHref.trim(),
          icon: formIcon.trim() || null,
        };
        const { error } = await supabase.from("nav_items").update(payload).eq("id", editItem.id);
        if (error) throw error;
      } else {
        const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.order_index)) + 1 : 0;
        const payload: NavItemInsert = {
          label: formLabel.trim(),
          href: formHref.trim(),
          icon: formIcon.trim() || null,
          order_index: maxOrder,
        };
        const { error } = await supabase.from("nav_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editItem ? "Item atualizado!" : "Item criado!");
      setIsModalOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-nav-items"] });
      qc.invalidateQueries({ queryKey: ["nav-items-public"] });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Erro ao salvar")),
  });

  // ── Delete ──
  const [deleteTarget, setDeleteTarget] = useState<NavItem | null>(null);
  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("nav_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item removido!");
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["admin-nav-items"] });
      qc.invalidateQueries({ queryKey: ["nav-items-public"] });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Erro ao excluir")),
  });

  const loading = settingsQuery.isLoading || itemsQuery.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader title="Gerenciar Menu" description="Configure a logo e os itens da navbar do site." />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
        <Tabs defaultValue="logo" className="space-y-4">
          <TabsList>
            <TabsTrigger value="logo"><Image className="h-4 w-4 mr-1.5" />Logo</TabsTrigger>
            <TabsTrigger value="items"><GripVertical className="h-4 w-4 mr-1.5" />Itens</TabsTrigger>
          </TabsList>

          {/* ── Logo Tab ── */}
          <TabsContent value="logo">
            <Card>
              <CardHeader><CardTitle className="text-lg">Configuração de Logo</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Logo Light (URL)</Label>
                    <Input value={logoLight} onChange={(e) => setLogoDraft((prev) => ({ ...prev, light: e.target.value }))} placeholder="https://..." />
                    {logoLight && (
                      <div className="border rounded-lg p-3 bg-white flex items-center justify-center h-20">
                        <img src={logoLight} alt="Preview light" className="max-h-14 w-auto object-contain" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Logo Dark (URL)</Label>
                    <Input value={logoDark} onChange={(e) => setLogoDraft((prev) => ({ ...prev, dark: e.target.value }))} placeholder="https://..." />
                    {logoDark && (
                      <div className="border rounded-lg p-3 bg-neutral-900 flex items-center justify-center h-20">
                        <img src={logoDark} alt="Preview dark" className="max-h-14 w-auto object-contain" />
                      </div>
                    )}
                  </div>
                </div>
                <Button onClick={() => saveLogo.mutate()} disabled={saveLogo.isPending}>
                  <Save className="h-4 w-4 mr-1.5" />
                  {saveLogo.isPending ? "Salvando..." : "Salvar Logos"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Items Tab ── */}
          <TabsContent value="items">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Itens do Menu</CardTitle>
                <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum item cadastrado.</p>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <SortableNavItem
                            key={item.id}
                            item={item}
                            onEdit={openEdit}
                            onDelete={setDeleteTarget}
                            onToggle={toggleItem}
                            onIconToggle={toggleIconBreakpoint}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* ── Create/Edit Modal ── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Editar Item" : "Novo Item"}</DialogTitle>
            <DialogDescription>Preencha os campos abaixo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Label *</Label>
              <Input value={formLabel} onChange={(e) => setFormLabel(e.target.value)} placeholder="Ex: Ferramentas" />
            </div>
            <div className="space-y-1.5">
              <Label>Href *</Label>
              <Input value={formHref} onChange={(e) => setFormHref(e.target.value)} placeholder="Ex: /ferramentas" />
            </div>
            <div className="space-y-1.5">
              <Label>Ícone (opcional)</Label>
              <Input value={formIcon} onChange={(e) => setFormIcon(e.target.value)} placeholder="Ex: wrench" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveItem.mutate()} disabled={saveItem.isPending}>
              {saveItem.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{deleteTarget?.label}"?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteItem.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


