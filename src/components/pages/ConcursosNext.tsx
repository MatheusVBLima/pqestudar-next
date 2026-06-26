"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useManagementMode } from "@/hooks/useManagementMode";
import { motion } from "framer-motion";
import { PageHero } from "@/components/layout/PageHero";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  Eye,
  Share2,
  ChevronRight,
  Filter,
  Search,
  X,
  FileText,
  Globe,
  MapPin,
  Trash2,
  RotateCcw,
  Check,
} from "lucide-react";
import { useOportunidades, useOportunidadesAdmin, OportunidadeFilters, Oportunidade } from "@/hooks/useOportunidades";
import { useUserRoles } from "@/hooks/useUserRoles";
import OportunidadeModal from "@/components/admin/OportunidadeModal";
import TrashConfirmDialog from "@/components/admin/TrashConfirmDialog";
import { ManagementToolbar } from "@/components/management/ManagementToolbar";
import { SaveContestButtonNext } from "@/components/ui/save-contest-button-next";
import { toast } from "sonner";
import { usePageSettings } from "@/hooks/usePageSettings";

type OportunidadeWithViews = Oportunidade & {
  escolaridades?: Oportunidade["escolaridades"];
  views_total?: number | null;
};

const SITUACAO_OPTIONS: Oportunidade["situacao"][] = ["Previsto", "Edital publicado", "Aberto", "Encerrado"];
const TIPO_OPTIONS: Oportunidade["tipo"][] = ["Concurso", "Programa educacional", "Processo seletivo", "Processo Seletivo Simplificado"];
const ESCOLARIDADE_OPTIONS: Oportunidade["escolaridade"][] = ["Fundamental", "Médio", "Superior"];
const ABRANGENCIA_OPTIONS: Oportunidade["abrangencia"][] = ["Nacional", "Estadual", "Municipal"];
const SOURCE_TIPO_OPTIONS = [
  { value: "oficial", label: "Oficial" },
  { value: "diario", label: "Diário Oficial" },
  { value: "banca", label: "Banca" },
  { value: "outro-oficial", label: "Outro oficial" },
];

const CATEGORIA_COLORS: Record<string, string> = {
  "Concurso": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "Políticas Públicas": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  "Educação": "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

const SITUACAO_COLORS: Record<string, string> = {
  "Previsto": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "Edital publicado": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Aberto": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "Encerrado": "bg-muted text-muted-foreground border-muted",
};

function FilterGroup({
  label,
  options,
  selectedValues,
  onToggle,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  selectedValues?: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2.5 text-sm font-semibold text-foreground">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selectedValues?.includes(option.value) ?? false;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(option.value)}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                isSelected
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-foreground/25 hover:bg-accent hover:text-foreground"
              }`}
            >
              {isSelected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function OportunidadeSearchItem({ item, onSelect }: { item: Oportunidade; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={CATEGORIA_COLORS[item.categoria] || ""}>
              {item.categoria}
            </Badge>
            <Badge variant="outline" className={SITUACAO_COLORS[item.situacao] || ""}>
              {item.situacao}
            </Badge>
          </div>
          <h3 className="font-semibold leading-snug line-clamp-2">{item.titulo}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {[item.orgao, item.banca, item.tipo, item.abrangencia].filter(Boolean).join(" • ")}
          </p>
        </div>
        <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </button>
  );
}

function OportunidadeSearchOverlay({
  open,
  onOpenChange,
  oportunidades,
  searchTerm,
  onSearchChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  oportunidades: Oportunidade[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSelect: (item: Oportunidade) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(id);
  }, [open]);

  const results = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const source = oportunidades.filter((item) => item.status_admin !== "lixeira");
    if (!term) return source.slice(0, 8);
    return source
      .filter((item) =>
        [
          item.titulo,
          item.orgao,
          item.banca,
          item.resumo_editorial,
          item.categoria,
          item.situacao,
          item.tipo,
          item.abrangencia,
          item.escolaridade,
          ...(item.escolaridades ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term)
      )
      .slice(0, 12);
  }, [oportunidades, searchTerm]);

  const hasQuery = searchTerm.trim().length > 0;

  return (
    <Dialog modal={false} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-2xl top-[10%] translate-y-0 overflow-hidden [&>button]:hidden">
        <DialogTitle className="sr-only">Buscar concursos</DialogTitle>
        <DialogDescription className="sr-only">
          Pesquise por concursos, programas educacionais e processos seletivos.
        </DialogDescription>

        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar concursos..."
            className="h-10 border-0 px-3 text-base shadow-none focus-visible:ring-0"
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar busca"
            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3">
          <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {hasQuery ? "Resultados" : "Em destaque"}
          </p>

          {results.length > 0 ? (
            <div className="space-y-1">
              {results.map((item) => (
                <OportunidadeSearchItem
                  key={item.id}
                  item={item}
                  onSelect={() => {
                    onSelect(item);
                    onOpenChange(false);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              Nenhum concurso encontrado para sua busca.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ConcursosNext() {
  const ps = usePageSettings("/concursos");
  const router = useRouter();
  const { isAdmin } = useUserRoles();
  const { isManagementMode } = useManagementMode();
  const [showFilters, setShowFilters] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Oportunidade | null>(null);
  
  // Trash state
  const [adminTab, setAdminTab] = useState<"ativo" | "lixeira">("ativo");
  const [trashDialogOpen, setTrashDialogOpen] = useState(false);
  const [trashDialogMode, setTrashDialogMode] = useState<"trash" | "purge" | "restore">("trash");
  const [trashDialogItem, setTrashDialogItem] = useState<Oportunidade | null>(null);

  // Filters state
  const [filters, setFilters] = useState<OportunidadeFilters>({});

  // Use appropriate hook based on mode
  const publicQuery = useOportunidades(filters);
  const adminQueryAtivo = useOportunidadesAdmin("ativo");
  const adminQueryLixeira = useOportunidadesAdmin("lixeira");

  const adminQuery = adminTab === "lixeira" ? adminQueryLixeira : adminQueryAtivo;

  const { oportunidades, isLoading, refetch } = isManagementMode && isAdmin
    ? adminQuery
    : publicQuery;

  // Filter admin data client-side when in management mode
  const displayedOportunidades = useMemo<Oportunidade[]>(() => {
    if (!isManagementMode || !isAdmin) return oportunidades;
    
    let filtered = [...oportunidades];
    
    if (filters.situacao?.length) {
      filtered = filtered.filter(o => filters.situacao!.includes(o.situacao));
    }
    if (filters.tipo?.length) {
      filtered = filtered.filter(o => filters.tipo!.includes(o.tipo));
    }
    if (filters.escolaridade?.length) {
      // Multi-select intersection: item has ANY of the selected escolaridades
      filtered = filtered.filter(o => {
        const item = o as OportunidadeWithViews;
        const itemEscolaridades = item.escolaridades?.length
          ? item.escolaridades
          : [o.escolaridade];
        return filters.escolaridade!.some(e => itemEscolaridades.includes(e as Oportunidade["escolaridade"]));
      });
    }
    if (filters.abrangencia?.length) {
      filtered = filtered.filter(o => filters.abrangencia!.includes(o.abrangencia));
    }
    if (filters.source_tipo?.length) {
      filtered = filtered.filter((o) =>
        o.fontes_oportunidade?.some((fonte) => filters.source_tipo!.includes(fonte.source_tipo))
      );
    }
    
    return filtered;
  }, [oportunidades, filters, isManagementMode, isAdmin]);

  const handleFilterChange = (key: keyof OportunidadeFilters, value: string) => {
    setFilters(prev => {
      const current = prev[key] || [];
      if (current.includes(value)) {
        return { ...prev, [key]: current.filter(v => v !== value) };
      }
      return { ...prev, [key]: [...current, value] };
    });
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.values(filters).some(arr => arr?.length);
  const activeFilterCount = Object.values(filters).reduce(
    (total, values) => total + (values?.length || 0),
    0
  );

  const handleShare = async (oportunidade: Oportunidade) => {
    const url = `${window.location.origin}/concursos/${oportunidade.slug}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: oportunidade.titulo,
          url,
        });
      } catch (_e) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      // Could add toast here
    }
  };

  const handleEdit = (item: Oportunidade) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingItem(null);
  };

  const handleTogglePublicado = async (item: Oportunidade) => {
    if (adminQuery.togglePublicado) {
      await adminQuery.togglePublicado({ id: item.id, publicado: !item.publicado });
    }
  };

  // Trash handlers
  const handleTrash = (item: Oportunidade) => {
    setTrashDialogItem(item);
    setTrashDialogMode("trash");
    setTrashDialogOpen(true);
  };

  const handleRestore = (item: Oportunidade) => {
    setTrashDialogItem(item);
    setTrashDialogMode("restore");
    setTrashDialogOpen(true);
  };

  const handlePurge = (item: Oportunidade) => {
    setTrashDialogItem(item);
    setTrashDialogMode("purge");
    setTrashDialogOpen(true);
  };

  const handleTrashConfirm = async () => {
    if (!trashDialogItem) return;

    try {
      if (trashDialogMode === "trash" && adminQuery.trashOportunidade) {
        await adminQuery.trashOportunidade(trashDialogItem.id);
        toast.success("Item enviado para a lixeira", {
          action: {
            label: "Desfazer",
            onClick: async () => {
              if (adminQueryLixeira.restoreOportunidade) {
                await adminQueryLixeira.restoreOportunidade(trashDialogItem.id);
              }
            },
          },
          duration: 10000, // 10 seconds to undo
        });
      } else if (trashDialogMode === "restore" && adminQuery.restoreOportunidade) {
        await adminQuery.restoreOportunidade(trashDialogItem.id);
      } else if (trashDialogMode === "purge" && adminQuery.purgeOportunidade) {
        await adminQuery.purgeOportunidade(trashDialogItem.id);
      }

      // Refresh both lists
      adminQueryAtivo.refetch();
      adminQueryLixeira.refetch();
    } catch (_error) {
      // Error already handled by mutation
    } finally {
      setTrashDialogOpen(false);
      setTrashDialogItem(null);
    }
  };

  const trashCount = adminQueryLixeira.oportunidades?.length || 0;

  return (
    <div className="flex-1 flex flex-col bg-background">
      <PageHero title={ps.headerTitle} description={ps.headerDescription} isLoading={ps.isLoading} />

      <main className="flex-1 w-full max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 pb-8">
        <div className="mb-8">
          {isAdmin && isManagementMode && (
            <ManagementToolbar
              createLabel="Novo concurso"
              onCreate={handleAdd}
              hint="Edite, despublique, restaure ou exclua concursos. Use as abas para alternar entre ativos e lixeira."
            />
          )}


          {/* Admin Tabs (Ativos / Lixeira) - Only in management mode */}
          {isAdmin && isManagementMode && (
            <div className="mb-4">
              <Tabs value={adminTab} onValueChange={(v) => setAdminTab(v as "ativo" | "lixeira")}>
                <TabsList>
                  <TabsTrigger value="ativo">
                    Ativos
                    <Badge variant="secondary" className="ml-2">
                      {adminQueryAtivo.oportunidades?.length || 0}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="lixeira" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Lixeira
                    {trashCount > 0 && (
                      <Badge variant="destructive" className="ml-1">
                        {trashCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          {/* Filters toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Abrir busca de concursos"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 overflow-hidden rounded-lg border bg-card"
            >
              <div className="flex flex-col gap-3 border-b bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Refine os resultados</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Combine uma ou mais opções em cada grupo.
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <p className="text-xs font-medium text-muted-foreground" aria-live="polite">
                    {displayedOportunidades.length}{" "}
                    {displayedOportunidades.length === 1 ? "resultado" : "resultados"}
                  </p>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1.5 px-2.5">
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      Limpar filtros
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-x-8 gap-y-6 px-4 py-5 sm:grid-cols-2 sm:px-5 lg:grid-cols-3 xl:grid-cols-[1.05fr_1.45fr_0.95fr_0.95fr_1.1fr]">
                <FilterGroup
                  label="Situação"
                  options={SITUACAO_OPTIONS.map((option) => ({ value: option, label: option }))}
                  selectedValues={filters.situacao}
                  onToggle={(value) => handleFilterChange("situacao", value)}
                />
                <FilterGroup
                  label="Tipo"
                  options={TIPO_OPTIONS.map((option) => ({ value: option, label: option }))}
                  selectedValues={filters.tipo}
                  onToggle={(value) => handleFilterChange("tipo", value)}
                />
                <FilterGroup
                  label="Escolaridade"
                  options={ESCOLARIDADE_OPTIONS.map((option) => ({ value: option, label: option }))}
                  selectedValues={filters.escolaridade}
                  onToggle={(value) => handleFilterChange("escolaridade", value)}
                />
                <FilterGroup
                  label="Abrangência"
                  options={ABRANGENCIA_OPTIONS.map((option) => ({ value: option, label: option }))}
                  selectedValues={filters.abrangencia}
                  onToggle={(value) => handleFilterChange("abrangencia", value)}
                />
                <FilterGroup
                  label="Origem"
                  options={SOURCE_TIPO_OPTIONS}
                  selectedValues={filters.source_tipo}
                  onToggle={(value) => handleFilterChange("source_tipo", value)}
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="h-full">
                <CardHeader className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-6 w-full" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : displayedOportunidades.length === 0 ? (
          <div className="text-center py-16">
            {adminTab === "lixeira" && isManagementMode ? (
              <>
                <Trash2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Lixeira vazia
                </h3>
                <p className="text-muted-foreground">
                  Não há itens na lixeira.
                </p>
              </>
            ) : (
              <>
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Nenhuma oportunidade encontrada
                </h3>
                <p className="text-muted-foreground">
                  {hasActiveFilters
                    ? "Tente ajustar os filtros para ver mais resultados."
                    : "Novas oportunidades serão publicadas em breve."}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedOportunidades.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <OportunidadeCard
                  item={item}
                  onShare={() => handleShare(item)}
                  onView={() => router.push(`/concursos/${item.slug}`)}
                  isManagementMode={isManagementMode && isAdmin}
                  isTrashMode={adminTab === "lixeira"}
                  onEdit={() => handleEdit(item)}
                  onTogglePublicado={() => handleTogglePublicado(item)}
                  onTrash={() => handleTrash(item)}
                  onRestore={() => handleRestore(item)}
                  onPurge={() => handlePurge(item)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <OportunidadeSearchOverlay
        open={searchOpen}
        onOpenChange={(open) => {
          setSearchOpen(open);
          if (!open) setSearchTerm("");
        }}
        oportunidades={displayedOportunidades as Oportunidade[]}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onSelect={(item) => router.push(`/concursos/${item.slug}`)}
      />

      {/* Admin Modal */}
      {isAdmin && (
        <OportunidadeModal
          open={modalOpen}
          onClose={handleModalClose}
          editingItem={editingItem}
          onSuccess={() => {
            handleModalClose();
            refetch();
          }}
        />
      )}

      {/* Trash Confirm Dialog */}
      <TrashConfirmDialog
        open={trashDialogOpen}
        onClose={() => {
          setTrashDialogOpen(false);
          setTrashDialogItem(null);
        }}
        onConfirm={handleTrashConfirm}
        title={trashDialogItem?.titulo || ""}
        mode={trashDialogMode}
        isLoading={
          adminQuery.isTrashing || 
          adminQuery.isRestoring || 
          adminQuery.isPurging
        }
      />
    </div>
  );
}

// Card component
interface OportunidadeCardProps {
  item: Oportunidade;
  onShare: () => void;
  onView: () => void;
  isManagementMode?: boolean;
  isTrashMode?: boolean;
  onEdit?: () => void;
  onTogglePublicado?: () => void;
  onTrash?: () => void;
  onRestore?: () => void;
  onPurge?: () => void;
}

function OportunidadeCard({
  item,
  onShare,
  onView,
  isManagementMode,
  isTrashMode,
  onEdit,
  onTogglePublicado,
  onTrash,
  onRestore,
  onPurge,
}: OportunidadeCardProps) {
  const isInTrash = item.status_admin === "lixeira" || isTrashMode;

  return (
    <Card className={`h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
      isInTrash 
        ? "opacity-70 border-destructive/30 bg-destructive/5" 
        : !item.publicado 
          ? "opacity-60 border-dashed" 
          : ""
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            <Badge
              variant="outline"
              className={CATEGORIA_COLORS[item.categoria] || ""}
            >
              {item.categoria}
            </Badge>
            
            {isInTrash && (
              <Badge variant="destructive" className="gap-1">
                <Trash2 className="h-3 w-3" />
                Excluído
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3 w-3" />
            {((item as OportunidadeWithViews).views_total ?? item.visualizacoes).toLocaleString("pt-BR")}
          </div>
        </div>
        
        <h3 className="text-lg font-semibold line-clamp-2 mt-2">
          {item.titulo}
        </h3>
        
        {!item.publicado && isManagementMode && !isInTrash && (
          <Badge variant="secondary" className="w-fit">
            Não publicado
          </Badge>
        )}

        {isInTrash && item.deleted_at && (
          <p className="text-xs text-muted-foreground">
            Excluído em {format(new Date(item.deleted_at), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <div className="space-y-2 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>
              {format(new Date(item.data_publicacao), "d 'de' MMMM 'de' yyyy", {
                locale: ptBR,
              })}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {item.abrangencia === "Nacional" ? (
              <Globe className="h-4 w-4" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            <span>{item.abrangencia}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          <Badge
            variant="outline"
            className={SITUACAO_COLORS[item.situacao] || ""}
          >
            {item.situacao}
          </Badge>
        </div>

        {/* Actions for non-trash items */}
        {!isTrashMode && (
          <>
            <div className="mt-auto pt-4 border-t flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onShare}
                className="shrink-0"
                aria-label="Compartilhar"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              
              <SaveContestButtonNext
                contestId={item.id}
                contestTitle={item.titulo}
                metadata={{
                  title: item.titulo,
                  slug: item.slug,
                  orgao: item.orgao || undefined,
                  banca: item.banca || undefined,
                  situacao: item.situacao,
                  abrangencia: item.abrangencia,
                }}
                variant="icon"
              />
              
              <Button
                onClick={onView}
                className="flex-1 gap-2 rounded-[1.2rem]"
              >
                Ver página completa
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Admin actions for active items */}
            {isManagementMode && (
              <div className="mt-3 pt-3 border-t flex items-center justify-between">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={onEdit}>
                    Editar
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onTrash}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant={item.publicado ? "secondary" : "default"}
                  size="sm"
                  onClick={onTogglePublicado}
                >
                  {item.publicado ? "Despublicar" : "Publicar"}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Trash mode actions */}
        {isTrashMode && isManagementMode && (
          <div className="mt-auto pt-4 border-t flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRestore}
              className="flex-1 gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={onPurge}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Excluir Definitivamente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}



