"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
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
import { GripVertical, Plus, Pencil, Trash2, Save, Image, Monitor, Tablet, Smartphone, Link2, ExternalLink, Eye, EyeOff, ListChecks, IdCard } from "lucide-react";
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
  is_new: boolean;
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

const VALID_TABS = ["logo", "items"] as const;
type MenuTab = (typeof VALID_TABS)[number];
const FALLBACK_LOGO_LIGHT = "/images/logo-light.png";
const FALLBACK_LOGO_DARK = "/images/logo-dark.png";
const NAVBAR_CTA_ICON = "id-card-cta";

function getTab(value: string | null): MenuTab {
  return VALID_TABS.includes(value as MenuTab) ? (value as MenuTab) : "items";
}

// ─── Sortable Row ───
function SortableNavItem({
  item, onEdit, onDelete, onToggle, onIconToggle, onToggleNew,
}: {
  item: NavItem;
  onEdit: (item: NavItem) => void;
  onDelete: (item: NavItem) => void;
  onToggle: (item: NavItem) => void;
  onToggleNew: (item: NavItem) => void;
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
        "flex flex-col gap-3 rounded-lg border bg-card/70 p-4 transition-all hover:border-primary/30 hover:bg-card",
        item.is_active ? "border-border" : "border-dashed opacity-75",
        isDragging && "z-10 shadow-lg ring-2 ring-primary/30"
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <button {...attributes} {...listeners} className="flex h-8 w-8 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing" aria-label="Reordenar">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-sm truncate">{item.label}</p>
            <Badge
              variant={item.is_active ? "default" : "outline"}
              className={cn(
                "gap-1 px-2 py-0 text-[11px]",
                item.is_active ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15" : "text-muted-foreground"
              )}
            >
              {item.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {item.is_active ? "Ativo" : "Oculto"}
            </Badge>
            {item.is_external && (
              <Badge variant="outline" className="gap-1 px-2 py-0 text-[11px] text-muted-foreground">
                <ExternalLink className="h-3 w-3" />
                Externo
              </Badge>
            )}
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Link2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{item.href}</span>
          </div>
        </div>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onToggleNew(item)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                  item.is_new
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
                aria-label={`Badge Novo: ${item.is_new ? 'ativo' : 'inativo'}`}
              >
                Novo
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Badge "Novo" {item.is_new ? 'ativo' : 'inativo'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
function CompactNavItem({
  item, onEdit, onDelete, onToggle, onIconToggle, onToggleNew,
}: {
  item: NavItem;
  onEdit: (item: NavItem) => void;
  onDelete: (item: NavItem) => void;
  onToggle: (item: NavItem) => void;
  onToggleNew: (item: NavItem) => void;
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
        "grid min-h-14 grid-cols-[2rem_minmax(13rem,1.4fr)_minmax(11rem,1fr)_7rem_5rem_8rem_5.5rem] items-center gap-3 border-t px-3 py-2.5 text-sm transition-colors first:border-t-0 hover:bg-muted/30",
        !item.is_active && "bg-muted/20 text-muted-foreground",
        isDragging && "relative z-10 rounded-md bg-card shadow-lg ring-2 ring-primary/30"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="flex h-8 w-8 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
        aria-label="Reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-foreground">{item.label}</span>
          {item.is_external && (
            <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px] font-medium text-muted-foreground">
              <ExternalLink className="h-3 w-3" />
              Externo
            </Badge>
          )}
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <Link2 className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{item.href}</span>
      </div>

      <Badge
        variant="outline"
        className={cn(
          "h-6 w-fit gap-1.5 rounded-md px-2 text-[11px] font-medium",
          item.is_active
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
            : "border-muted bg-muted/60 text-muted-foreground"
        )}
      >
        {item.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        {item.is_active ? "Ativo" : "Oculto"}
      </Badge>

      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToggleNew(item)}
              className={cn(
                "h-7 w-fit rounded-md px-2 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                item.is_new
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              aria-label={`Badge Novo: ${item.is_new ? 'ativo' : 'inativo'}`}
            >
              Novo
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Badge "Novo" {item.is_new ? 'ativo' : 'inativo'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider delayDuration={200}>
        <div className="flex items-center gap-1">
          {iconBreakpoints.map(({ field, icon: BpIcon, label }) => (
            <Tooltip key={field}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onIconToggle(item, field)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md border text-xs transition-colors",
                    item.icon && item[field]
                      ? "border-primary/25 bg-primary/10 text-primary"
                      : "border-transparent bg-muted/60 text-muted-foreground hover:text-foreground",
                    !item.icon && "opacity-45"
                  )}
                  aria-label={`${label}: ícone ${item[field] ? 'visível' : 'oculto'}`}
                  disabled={!item.icon}
                >
                  <BpIcon className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {item.icon ? `${label}: ícone ${item[field] ? 'visível' : 'oculto'}` : "Item sem ícone"}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

      <div className="flex items-center justify-end gap-1">
        <Switch checked={item.is_active} onCheckedChange={() => onToggle(item)} aria-label="Ativo" />
        <Button variant="ghost" size="icon" onClick={() => onEdit(item)} aria-label="Editar" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(item)} className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Excluir">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminMenu() {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = getTab(searchParams.get("tab"));

  const handleTabChange = useCallback(
    (value: string) => {
      router.replace(`/admin/menu?tab=${value}`, { scroll: false });
    },
    [router]
  );

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
  const previewLogoLight = logoDraft.light?.trim()
    ? logoDraft.light
    : settingsQuery.data?.logo_light_url || FALLBACK_LOGO_LIGHT;
  const previewLogoDark = logoDraft.dark?.trim()
    ? logoDraft.dark
    : settingsQuery.data?.logo_dark_url || FALLBACK_LOGO_DARK;

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
  const allItems = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);
  const ctaItem = useMemo(() => allItems.find((item) => item.icon === NAVBAR_CTA_ICON) ?? null, [allItems]);
  const items = useMemo(() => allItems.filter((item) => item.icon !== NAVBAR_CTA_ICON), [allItems]);
  const activeItems = useMemo(() => items.filter((item) => item.is_active).length, [items]);
  const hiddenItems = items.length - activeItems;
  const iconItems = useMemo(() => items.filter((item) => item.icon).length, [items]);
  const externalItems = useMemo(() => items.filter((item) => item.is_external).length, [items]);
  const newBadgeItems = useMemo(() => items.filter((item) => item.is_new).length, [items]);

  // ── Navbar CTA ──
  const [ctaDraft, setCtaDraft] = useState<{
    label?: string;
    href?: string;
    desktop?: boolean;
    tablet?: boolean;
    mobile?: boolean;
  }>({});
  const ctaLabel = ctaDraft.label ?? ctaItem?.label ?? "Carteirinha estudantil";
  const ctaHref = ctaDraft.href ?? ctaItem?.href ?? "/carteirinha";
  const ctaDesktop = ctaDraft.desktop ?? ctaItem?.show_icon_desktop ?? true;
  const ctaTablet = ctaDraft.tablet ?? ctaItem?.show_icon_tablet ?? true;
  const ctaMobile = ctaDraft.mobile ?? ctaItem?.show_icon_mobile ?? true;

  const saveCta = useMutation({
    mutationFn: async () => {
      if (!ctaLabel.trim() || !ctaHref.trim()) throw new Error("Texto e rota são obrigatórios");
      const isExternal = /^https?:\/\//i.test(ctaHref.trim());
      const payload: NavItemUpdate = {
        label: ctaLabel.trim(),
        href: ctaHref.trim(),
        icon: NAVBAR_CTA_ICON,
        is_active: true,
        is_external: isExternal,
        open_in_new_tab: isExternal,
        show_icon_desktop: ctaDesktop,
        show_icon_tablet: ctaTablet,
        show_icon_mobile: ctaMobile,
      };

      if (ctaItem) {
        const { error } = await supabase.from("nav_items").update(payload).eq("id", ctaItem.id);
        if (error) throw error;
      } else {
        const insertPayload: NavItemInsert = {
          ...payload,
          label: ctaLabel.trim(),
          href: ctaHref.trim(),
          order_index: 9999,
        };
        const { error } = await supabase.from("nav_items").insert(insertPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("CTA da navbar atualizado!");
      setCtaDraft({});
      qc.invalidateQueries({ queryKey: ["admin-nav-items"] });
      qc.invalidateQueries({ queryKey: ["nav-items-public"] });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e, "Erro ao salvar CTA")),
  });

  // ── DnD ──
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIdx = items.findIndex((i) => i.id === active.id);
      const newIdx = items.findIndex((i) => i.id === over.id);
      const previousItems = allItems;
      const reordered = arrayMove(items, oldIdx, newIdx).map((it, idx) => ({ ...it, order_index: idx }));
      qc.setQueryData(["admin-nav-items"], ctaItem ? [...reordered, ctaItem] : reordered);
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
    [allItems, ctaItem, items, qc]
  );

  // ── Toggle ──
  const toggleItem = useCallback(
    async (item: NavItem) => {
      const newActive = !item.is_active;
      const previousItems = allItems;
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
    [allItems, qc]
  );

  const toggleNew = useCallback(
    async (item: NavItem) => {
      const newValue = !item.is_new;
      const previousItems = allItems;
      qc.setQueryData<NavItem[]>(["admin-nav-items"], (prev = []) =>
        prev.map((entry) => (entry.id === item.id ? { ...entry, is_new: newValue } : entry))
      );
      const payload: NavItemUpdate = { is_new: newValue };
      const { error } = await supabase.from("nav_items").update(payload).eq("id", item.id);
      if (error) {
        qc.setQueryData(["admin-nav-items"], previousItems);
        toast.error("Erro ao alterar badge Novo");
      } else {
        qc.invalidateQueries({ queryKey: ["admin-nav-items"] });
        qc.invalidateQueries({ queryKey: ["nav-items-public"] });
      }
    },
    [allItems, qc]
  );

  // ── Icon breakpoint toggle ──
  const toggleIconBreakpoint = useCallback(
    async (item: NavItem, field: 'show_icon_desktop' | 'show_icon_tablet' | 'show_icon_mobile') => {
      const newValue = !item[field];
      const previousItems = allItems;
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
    [allItems, qc]
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
      <PageHeader
        title="Navegação"
        description="Organize os links, a ordem e a visibilidade da navbar do site."
      />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="h-auto rounded-lg border border-border/70 bg-card/70 p-1">
            <TabsTrigger value="logo" className="gap-2 rounded-md px-3 py-1.5 text-xs">
              <Image className="h-3.5 w-3.5" />
              Logo
            </TabsTrigger>
            <TabsTrigger value="items" className="gap-2 rounded-md px-3 py-1.5 text-xs">
              <GripVertical className="h-3.5 w-3.5" />
              Itens
            </TabsTrigger>
          </TabsList>

          {/* ── Logo Tab ── */}
          <TabsContent value="logo" className="mt-0">
            <Card>
              <CardHeader className="gap-4 pb-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Image className="h-5 w-5 text-primary" />
                      Configuração de logo
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Defina as versões usadas em fundos claros e escuros da navegação pública.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => saveLogo.mutate()} disabled={saveLogo.isPending}>
                    <Save className="h-4 w-4 mr-1.5" />
                    {saveLogo.isPending ? "Salvando..." : "Salvar logos"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border bg-card/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <Label>Logo light</Label>
                        <p className="text-xs text-muted-foreground">Usada em superfícies claras.</p>
                      </div>
                      <span className="rounded-md border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">Claro</span>
                    </div>
                    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_14rem] xl:items-end">
                      <Input value={logoLight} onChange={(e) => setLogoDraft((prev) => ({ ...prev, light: e.target.value }))} placeholder="https://..." />
                      <div className="flex h-24 items-center justify-center rounded-md border bg-white p-3">
                        <img src={previewLogoLight} alt="Preview light" className="max-h-16 w-auto max-w-full object-contain" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <Label>Logo dark</Label>
                        <p className="text-xs text-muted-foreground">Usada em superfícies escuras.</p>
                      </div>
                      <span className="rounded-md border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">Escuro</span>
                    </div>
                    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_14rem] xl:items-end">
                      <Input value={logoDark} onChange={(e) => setLogoDraft((prev) => ({ ...prev, dark: e.target.value }))} placeholder="https://..." />
                      <div className="flex h-24 items-center justify-center rounded-md border bg-neutral-950 p-3">
                        <img src={previewLogoDark} alt="Preview dark" className="max-h-16 w-auto max-w-full object-contain" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Items Tab ── */}
          <TabsContent value="items" className="mt-0 space-y-4">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.055] to-card">
              <CardHeader className="gap-4 pb-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <IdCard className="h-5 w-5 text-primary" />
                      CTA da navbar
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Edite o botão de destaque exibido antes dos ícones utilitários e dentro do menu mobile.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => saveCta.mutate()} disabled={saveCta.isPending}>
                    <Save className="mr-1.5 h-4 w-4" />
                    {saveCta.isPending ? "Salvando..." : "Salvar CTA"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end">
                  <div className="space-y-2">
                    <Label htmlFor="navbar-cta-label">Texto do botão</Label>
                    <Input
                      id="navbar-cta-label"
                      value={ctaLabel}
                      onChange={(event) => setCtaDraft((prev) => ({ ...prev, label: event.target.value }))}
                      placeholder="Carteirinha estudantil"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="navbar-cta-href">Rota ou URL</Label>
                    <Input
                      id="navbar-cta-href"
                      value={ctaHref}
                      onChange={(event) => setCtaDraft((prev) => ({ ...prev, href: event.target.value }))}
                      placeholder="/carteirinha"
                    />
                  </div>
                  <div className="flex min-h-10 flex-wrap items-center gap-x-5 gap-y-3 rounded-lg border bg-background/60 px-4 py-2.5">
                    <Label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
                      <Switch
                        checked={ctaDesktop}
                        onCheckedChange={(checked) => setCtaDraft((prev) => ({ ...prev, desktop: checked }))}
                        aria-label="Exibir CTA no desktop"
                      />
                      <Monitor className="h-3.5 w-3.5 text-muted-foreground" /> Desktop
                    </Label>
                    <Label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
                      <Switch
                        checked={ctaTablet}
                        onCheckedChange={(checked) => setCtaDraft((prev) => ({ ...prev, tablet: checked }))}
                        aria-label="Exibir CTA no tablet"
                      />
                      <Tablet className="h-3.5 w-3.5 text-muted-foreground" /> Tablet
                    </Label>
                    <Label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
                      <Switch
                        checked={ctaMobile}
                        onCheckedChange={(checked) => setCtaDraft((prev) => ({ ...prev, mobile: checked }))}
                        aria-label="Exibir CTA no mobile"
                      />
                      <Smartphone className="h-3.5 w-3.5 text-muted-foreground" /> Mobile
                    </Label>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 rounded-lg border border-dashed bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prévia</p>
                    <p className="mt-1 text-xs text-muted-foreground">A aparência final acompanha o tema ativo do site.</p>
                  </div>
                  <div className="inline-flex h-9 max-w-full items-center gap-2 self-start rounded-full border border-primary/25 bg-primary/[0.08] px-4 text-sm font-semibold text-primary shadow-sm sm:self-auto">
                    <IdCard className="h-4 w-4 shrink-0" />
                    <span className="truncate">{ctaLabel || "Carteirinha estudantil"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="gap-4 pb-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ListChecks className="h-5 w-5 text-primary" />
                      Itens do menu
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Arraste para reordenar, publique ou oculte itens e ajuste a exibição dos ícones por dispositivo.
                    </p>
                  </div>
                  <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-md border bg-muted/30 px-2 py-1"><strong className="text-foreground">{items.length}</strong> itens</span>
                  <span className="rounded-md border bg-muted/30 px-2 py-1"><strong className="text-foreground">{activeItems}</strong> ativos</span>
                  <span className="rounded-md border bg-muted/30 px-2 py-1"><strong className="text-foreground">{hiddenItems}</strong> ocultos</span>
                  <span className="rounded-md border bg-muted/30 px-2 py-1"><strong className="text-foreground">{newBadgeItems}</strong> novo</span>
                  <span className="rounded-md border bg-muted/30 px-2 py-1"><strong className="text-foreground">{iconItems}</strong> com ícone</span>
                  <span className="rounded-md border bg-muted/30 px-2 py-1"><strong className="text-foreground">{externalItems}</strong> externos</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {items.length === 0 ? (
                  <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-8 text-center">
                    <ListChecks className="h-10 w-10 text-muted-foreground" />
                    <p className="mt-4 text-sm font-medium">Nenhum item cadastrado</p>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">Crie o primeiro link para montar a navbar pública do site.</p>
                    <Button className="mt-4" onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" />Adicionar item</Button>
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                      <div className="overflow-x-auto rounded-lg border">
                        <div className="min-w-[920px]">
                          <div className="grid grid-cols-[2rem_minmax(13rem,1.4fr)_minmax(11rem,1fr)_7rem_5rem_8rem_5.5rem] items-center gap-3 border-b bg-muted/40 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            <span />
                            <span>Item</span>
                            <span>Rota</span>
                            <span>Status</span>
                            <span>Novo</span>
                            <span>Ícones</span>
                            <span className="text-right">Ações</span>
                          </div>
                        {items.map((item) => (
                          <CompactNavItem
                            key={item.id}
                            item={item}
                            onEdit={openEdit}
                            onDelete={setDeleteTarget}
                            onToggle={toggleItem}
                            onToggleNew={toggleNew}
                            onIconToggle={toggleIconBreakpoint}
                          />
                        ))}
                        </div>
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


