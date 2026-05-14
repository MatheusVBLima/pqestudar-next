"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, lazy, useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHero } from "@/components/layout/PageHero";
import { useManagementMode } from "@/hooks/useManagementMode";
import { X, Sparkles, Brain, Shield, GraduationCap, Wrench, Zap, Plus, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
"@/components/ui/alert-dialog";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useTools, Tool, UseToolsOptions } from "@/hooks/useTools";
import { ToolModal } from "@/components/admin/ToolModal";
import { SaveToolButtonNext } from "@/components/ui/save-tool-button-next";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious } from
"@/components/ui/pagination";
import { useAnalyticsTracker } from "@/hooks/useAnalyticsTracker";
import { usePageSettings } from "@/hooks/usePageSettings";

const FerramentasManagementGrid = lazy(() => import("@/legacy-pages/ferramentas/FerramentasManagementGrid"));

// Helper: verifica se uma ferramenta tem destaque ativo
function isFeaturedActive(tool: Tool): boolean {
  if (!tool.is_featured) return false;
  if (tool.featured_indefinite) return true;
  const now = Date.now();
  const start = tool.featured_start ? new Date(tool.featured_start).getTime() : null;
  const end = tool.featured_end ? new Date(tool.featured_end).getTime() : null;
  if (start === null || end === null) return false;
  return now >= start && now <= end;
}

// Categorias disponíveis
const CATEGORIES = [
"Inteligência Artificial",
"Produtividade",
"Segurança e Privacidade",
"Cursos Gratuitos",
"Utilidades"];


// Ícones padrão para categorias
const CATEGORY_ICONS: Record<string, any> = {
  "Inteligência Artificial": Brain,
  "Produtividade": Zap,
  "Segurança e Privacidade": Shield,
  "Cursos Gratuitos": GraduationCap,
  "Utilidades": Wrench
};

// Componente de controles de paginação
function PaginationControls({
  currentPage,
  totalPages,
  onPageChange




}: {currentPage: number;totalPages: number;onPageChange: (page: number) => void;}) {
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('ellipsis');
      }

      // Show pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            aria-disabled={currentPage === 1}>

            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Anterior</span>
          </PaginationPrevious>
        </PaginationItem>

        {pageNumbers.map((page, index) =>
        page === 'ellipsis' ?
        <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem> :

        <PaginationItem key={page}>
              <PaginationLink
            onClick={() => onPageChange(page)}
            isActive={currentPage === page}
            className="cursor-pointer"
            aria-current={currentPage === page ? 'page' : undefined}>

                {page}
              </PaginationLink>
            </PaginationItem>

        )}

        <PaginationItem>
          <PaginationNext
            onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            aria-disabled={currentPage === totalPages}>

            <span className="hidden sm:inline mr-2">Próximo</span>
            <ChevronRight className="h-4 w-4" />
          </PaginationNext>
        </PaginationItem>
      </PaginationContent>
    </Pagination>);

}


function PublicToolCard({ tool }: {tool: Tool;}) {
  const { track } = useAnalyticsTracker();
  const router = useRouter();
  const Icon = tool.tags[0] ? CATEGORY_ICONS[tool.tags[0]] || Sparkles : Sparkles;
  const featured = isFeaturedActive(tool);
  const detailHref = tool.slug ? `/ferramentas/${tool.slug}` : null;

  const handleCardClick = () => {
    if (!detailHref) return;
    track({
      event_name: "tool_card_click",
      entity_type: "tool",
      entity_id: tool.id,
      path: "/ferramentas",
      meta: { tool_slug: tool.slug, tool_name: tool.name, tool_tags: tool.tags },
    });
    router.push(detailHref);
  };

  return (
    <div className="relative group h-full">
      <Card
        onClick={handleCardClick}
        className={`h-full transition-all duration-300 flex flex-col ${
          detailHref ? "cursor-pointer" : ""
        } ${featured ? "ring-2 ring-violet-500/60 shadow-md" : "transition-shadow hover:shadow-lg"}`}
      >
        <CardHeader>
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
              <Icon
                className="w-8 h-8 text-primary"
                aria-hidden="true"
                style={{ display: tool.icon_url ? "none" : "block" }}
              />
            </div>
            <CardTitle className="text-xl leading-tight flex flex-wrap items-center gap-2 mt-0">
              {tool.name}
              {featured && (
                <Badge className="text-xs bg-amber-400 text-amber-950 border-amber-500 hover:bg-amber-400 gap-1 shrink-0">
                  <Star className="w-3 h-3 fill-amber-950" aria-hidden="true" />
                  Destaque
                </Badge>
              )}
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
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              {detailHref && (
                <Button
                  asChild
                  variant="default"
                  size="sm"
                  className="flex-1 rounded-[1.2rem]"
                  data-evt="view_tool_detail"
                >
                  <Link
                    href={detailHref}
                    onClick={() => {
                      track({
                        event_name: "tool_card_click",
                        entity_type: "tool",
                        entity_id: tool.id,
                        path: "/ferramentas",
                        meta: {
                          tool_slug: tool.slug,
                          tool_name: tool.name,
                          tool_tags: tool.tags,
                          source: "cta_button",
                        },
                      });
                    }}
                    aria-label={`Ver detalhes de ${tool.name}`}
                  >
                    Ver ferramenta
                  </Link>
                </Button>
              )}
              <SaveToolButtonNext toolId={tool.id} toolName={tool.name} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Ferramentas() {
  const router = useRouter();
  const pathname = usePathname() ?? "/ferramentas";
  const ps = usePageSettings("/ferramentas");
  const [currentPage, setCurrentPage] = useState(1);

  // EXATAMENTE o mesmo hook usado em /parceiros
  const { isAdmin } = useUserRoles();

  // Debug flag (apenas em dev)
  const isDev = process.env.NODE_ENV === 'development';
  const [forceAdmin, setForceAdmin] = useState(false);

  useEffect(() => {
    if (isDev) {
      const debugParam = new URLSearchParams(window.location.search).get('adminPreview') === '1';
      const debugStorage = localStorage.getItem('forceAdmin') === '1';
      setForceAdmin(debugParam || debugStorage);
    }
  }, [isDev]);

  useEffect(() => {
    const syncPageFromUrl = () => {
      const value = Number.parseInt(
        new URLSearchParams(window.location.search).get("page") || "1",
        10,
      );
      setCurrentPage(Number.isFinite(value) && value > 0 ? value : 1);
    };

    syncPageFromUrl();
    window.addEventListener("popstate", syncPageFromUrl);
    return () => window.removeEventListener("popstate", syncPageFromUrl);
  }, []);

  const effectiveAdmin = isAdmin || forceAdmin;

  const { isManagementMode } = useManagementMode();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [deleteTool, setDeleteTool] = useState<Tool | null>(null);
  const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);
  const [draftTools, setDraftTools] = useState<Tool[] | null>(null);

  // Fetch tools from Supabase with pagination
  const toolsOptions: UseToolsOptions = {
    includeInvisible: isManagementMode && effectiveAdmin,
    page: isManagementMode ? 1 : currentPage, // Admin vê tudo, público tem paginação
    pageSize: 12,
    tags: isManagementMode ? [] : selectedTags
  };

  const {
    tools,
    total,
    totalPages,
    loading,
    addTool,
    updateTool,
    deleteTool: removeTool,
    toggleVisible,
    reorderTools
  } = useTools(toolsOptions);

  // Keep a local draft only while in management mode.
  // This avoids duplicating server state in public mode.
  useEffect(() => {
    if (!isManagementMode) {
      setDraftTools(null);
      setHasUnsavedOrder(false);
      return;
    }

    if (!hasUnsavedOrder) {
      setDraftTools(tools);
    }
  }, [isManagementMode, tools, hasUnsavedOrder]);

  // Reset page to 1 when filters change
  useEffect(() => {
    if (!isManagementMode && currentPage > 1) {
      const params = new URLSearchParams(window.location.search);
      params.set("page", "1");
      router.replace(`${pathname}?${params.toString()}`);
      setCurrentPage(1);
    }
  }, [selectedTags, isManagementMode, currentPage, router, pathname]);

  // Scroll to top when page changes (smooth)
  useEffect(() => {
    if (!isManagementMode) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });
    }
  }, [currentPage, isManagementMode]);

  // Filtragem + ordenação de destaques — tudo num único memo para garantir reatividade
  const sortedDisplayedTools = useMemo(() => {
    const sourceTools = isManagementMode ? draftTools ?? tools : tools;

    // 1. Filtro por categoria dropdown (modo admin)
    let base = sourceTools;
    if (isManagementMode && categoryFilter !== "all") {
      base = base.filter((tool) => tool.tags.includes(categoryFilter));
    }

    // 2. No modo admin, mantém a ordem do sort_order (sem reordenar destaques)
    if (isManagementMode) return base;

    // 3. Modo público: destaques ativos SEMPRE primeiro
    const active = base.filter(isFeaturedActive);
    const rest = base.filter((t) => !isFeaturedActive(t));

    if (selectedTags.length === 0) {
      // Sem filtro de categoria: até 3 destaques no topo
      // Prioridade: indefinidos primeiro, depois por featured_start mais recente
      const sortedActive = [...active].sort((a, b) => {
        if (a.featured_indefinite && !b.featured_indefinite) return -1;
        if (!a.featured_indefinite && b.featured_indefinite) return 1;
        const dateA = a.featured_start ? new Date(a.featured_start).getTime() : 0;
        const dateB = b.featured_start ? new Date(b.featured_start).getTime() : 0;
        return dateB - dateA;
      });
      return [...sortedActive.slice(0, 3), ...rest];
    } else {
      // Com filtro de categoria: até 1 destaque ativo por categoria selecionada no topo
      const seenCategories = new Set<string>();
      const featuredFirst: Tool[] = [];
      const normalRest: Tool[] = [];

      for (const tool of active) {
        const matchingCategory = tool.tags.find(
          (tag) => selectedTags.includes(tag) && !seenCategories.has(tag)
        );
        if (matchingCategory) {
          seenCategories.add(matchingCategory);
          featuredFirst.push(tool);
        } else {
          normalRest.push(tool);
        }
      }

      return [...featuredFirst, ...normalRest, ...rest];
    }
  }, [tools, draftTools, isManagementMode, categoryFilter, selectedTags]);

  const availableTags = CATEGORIES.filter((tag) => !selectedTags.includes(tag));

  const handleSelectTag = (tag: string) => {
    setSelectedTags((prev) => [...prev, tag]);
  };

  const handleRemoveTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleClearAll = () => {
    setSelectedTags([]);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      const params = new URLSearchParams(window.location.search);
      params.set("page", String(newPage));
      router.replace(`${pathname}?${params.toString()}`);
      setCurrentPage(newPage);
    }
  };

  const handleKeyDown = (
  e: React.KeyboardEvent<HTMLDivElement>,
  action: () => void) =>
  {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };

  // Keyboard navigation for pagination
  useEffect(() => {
    if (isManagementMode) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowLeft' && currentPage > 1) {
        handlePageChange(currentPage - 1);
      } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        handlePageChange(currentPage + 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, totalPages, isManagementMode]);

  const handleAddTool = () => {
    setEditingTool(null);
    setModalOpen(true);
  };

  const handleEdit = (tool: Tool) => {
    setEditingTool(tool);
    setModalOpen(true);
  };

  const handleSaveTool = async (toolData: Partial<Tool>) => {
    try {
      if (editingTool) {
        await updateTool(editingTool.id, toolData);
      } else {
        await addTool(toolData as Omit<Tool, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'sort_order'>);
      }
      setModalOpen(false);
      setEditingTool(null);
    } catch (error) {
      // Error toast already shown by useTools hook
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteTool) {
      await removeTool(deleteTool.id);
      setDeleteTool(null);
    }
  };

  const handleSaveOrder = async () => {
    const sourceTools = draftTools ?? tools;
    await reorderTools(sourceTools);
    setHasUnsavedOrder(false);
  };

  // Pagination range display
  const pageStart = (currentPage - 1) * 12 + 1;
  const pageEnd = Math.min(currentPage * 12, total);

  // Filters and pagination stay static — only the grid shows loading
  const showFilters = !isManagementMode && CATEGORIES.length > 0;
  const showCount = total > 0;
  const showPagination = !isManagementMode && totalPages > 1;

  return (
    <>
        <main className="flex-1">
          <PageHero title={ps.headerTitle} description={ps.headerDescription} isLoading={ps.isLoading} />

          {/* Controles Admin */}
          {isManagementMode && effectiveAdmin &&
          <section className="pb-6 px-4 sm:px-6 lg:px-8">
              <div className="w-full max-w-[1440px] mx-auto">
                <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border">

                  <Button onClick={handleAddTool} size="sm" data-evt="admin_add">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Ferramenta
                  </Button>

                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filtrar por categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as categorias</SelectItem>
                      {CATEGORIES.map((cat) =>
                    <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                    )}
                    </SelectContent>
                  </Select>

                  {showCount &&
                <Badge variant="secondary" className="ml-auto">
                      {sortedDisplayedTools.length} ferramenta(s)
                    </Badge>
                }

                  {hasUnsavedOrder &&
                <Button
                  onClick={handleSaveOrder}
                  variant="default"
                  size="sm"
                  data-evt="admin_reorder">

                      Salvar ordem
                    </Button>
                }
                </motion.div>
              </div>
            </section>
          }

          {/* Filtros (modo público) */}
          {!isManagementMode && showFilters &&
          <section className="pb-12 px-4 sm:px-6 lg:px-8">
              <div className="w-full max-w-[1440px] mx-auto">
                <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}>

                  <h2 className="text-2xl font-semibold text-foreground mb-6 my-[30px]">
                    Categorias
                  </h2>

                  {/* Contador de Resultados com Paginação */}
                  {showCount && total > 0 &&
                <p
                  className="text-sm text-muted-foreground mb-4"
                  aria-live="polite"
                  aria-atomic="true">

                      Mostrando {pageStart}–{pageEnd} de {total} {total === 1 ? 'ferramenta' : 'ferramentas'}
                    </p>
                }

                  {/* Caixa de Seleção */}
                  <div
                  className="mb-6 p-4 rounded-lg border-2 border-dashed border-border bg-muted/20 min-h-[80px] flex flex-wrap gap-2 items-start"
                  role="list"
                  aria-label="Categorias selecionadas">

                    {selectedTags.length === 0 ?
                  <p className="text-muted-foreground text-sm self-center">
                        Selecione uma ou mais categorias…
                      </p> :

                  <AnimatePresence mode="popLayout">
                        {selectedTags.map((tag) =>
                    <motion.div
                      key={tag}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      role="listitem">

                            <Badge
                        variant="secondary"
                        className="px-3 py-2 text-sm font-semibold rounded-2xl cursor-pointer hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex items-center gap-2"
                        tabIndex={0}
                        onClick={() => handleRemoveTag(tag)}
                        onKeyDown={(e) =>
                        handleKeyDown(e, () => handleRemoveTag(tag))
                        }
                        aria-label={`Remover filtro ${tag}`}
                        data-evt="tag_remove">

                              {tag}
                              <X className="w-3 h-3" aria-hidden="true" />
                            </Badge>
                          </motion.div>
                    )}
                      </AnimatePresence>
                  }
                  </div>

                  {/* Pool de Tags */}
                  {availableTags.length > 0 ?
                <div
                  className="flex flex-wrap gap-2 mb-4"
                  role="list"
                  aria-label="Categorias disponíveis">

                      <AnimatePresence mode="popLayout">
                        {availableTags.map((tag) =>
                    <motion.div
                      key={tag}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      role="listitem">

                            <Badge
                        variant="outline"
                        className="px-3 py-2 text-sm font-semibold rounded-2xl cursor-pointer hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        tabIndex={0}
                        onClick={() => handleSelectTag(tag)}
                        onKeyDown={(e) =>
                        handleKeyDown(e, () => handleSelectTag(tag))
                        }
                        aria-label={`Adicionar filtro ${tag}`}
                        data-evt="tag_select">

                              {tag}
                            </Badge>
                          </motion.div>
                    )}
                      </AnimatePresence>
                    </div> :

                <p className="text-sm text-muted-foreground">
                      Todas as categorias selecionadas
                    </p>
                }

                  {/* Botão Limpar Tudo */}
                  {selectedTags.length > 0 &&
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}>

                      <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="text-muted-foreground hover:text-foreground"
                    data-evt="clear_all">

                        Limpar tudo
                      </Button>
                    </motion.div>
                }
                </motion.div>
              </div>
            </section>
          }

          {/* Paginação Superior (modo público) */}
          {showPagination &&
          <section className="pb-6 px-4 sm:px-6 lg:px-8">
              <div className="w-full max-w-[1440px] mx-auto">
                <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange} />

              </div>
            </section>
          }

          {/* Grid de Ferramentas */}
          <section className="pb-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-[1440px] mx-auto">
              {/* Loading State */}
              {loading &&
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) =>
                <Card key={i} className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <Skeleton className="h-12 w-12 rounded-xl" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-5/6" />
                        </div>
                      </div>
                      <div className="flex gap-2 mb-3">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-24" />
                      </div>
                      <Skeleton className="h-9 w-full" />
                    </Card>
                )}
                </div>
              }

              {/* Empty State - Public (sem admin) */}
              {!loading && tools.length === 0 && !effectiveAdmin &&
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                data-evt="empty_state_view">

                  <Card className="p-12 text-center">
                    <div className="max-w-md mx-auto">
                      <h3 className="text-lg font-semibold mb-2">Nada por aqui ainda</h3>
                      <p className="text-sm text-muted-foreground">
                        Em breve novas ferramentas
                      </p>
                    </div>
                  </Card>
                </motion.div>
              }

              {/* Empty State - Admin */}
              {!loading && tools.length === 0 && effectiveAdmin &&
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                data-evt="empty_state_view">

                  <Card className="p-12 text-center">
                    <div className="max-w-md mx-auto">
                      <h3 className="text-lg font-semibold mb-2">Nenhuma ferramenta cadastrada</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        Comece adicionando a primeira ferramenta ao arsenal
                      </p>
                      <Button
                      onClick={handleAddTool}
                      data-evt="empty_state_cta_click">

                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar primeira ferramenta
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              }

              {/* Filtered Empty State */}
              {!loading && tools.length > 0 && sortedDisplayedTools.length === 0 &&
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}>

                  <Card className="p-12 text-center">
                    <div className="max-w-md mx-auto">
                      <h3 className="text-lg font-semibold mb-2">Nenhuma ferramenta encontrada</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Nenhuma ferramenta corresponde aos filtros selecionados
                      </p>
                      <Button variant="outline" onClick={handleClearAll}>
                        Limpar filtros
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              }

              {/* Tools Grid */}
              {!loading && sortedDisplayedTools.length > 0 && isManagementMode && (
                <Suspense
                  fallback={
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                      {[1, 2, 3].map((key) => (
                        <Skeleton key={key} className="h-64" />
                      ))}
                    </div>
                  }
                >
                  <FerramentasManagementGrid
                    tools={sortedDisplayedTools}
                    onReorder={(nextTools) => {
                      setDraftTools(nextTools);
                      setHasUnsavedOrder(true);
                    }}
                    onEdit={handleEdit}
                    onToggleVisible={toggleVisible}
                    onDelete={setDeleteTool}
                  />
                </Suspense>
              )}

              {!loading && sortedDisplayedTools.length > 0 && !isManagementMode &&
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                  {sortedDisplayedTools.map((tool) =>
                <PublicToolCard key={tool.id} tool={tool} />
                )}
              </motion.div>
              }
            </div>
          </section>

          {/* Paginação Inferior (modo público) */}
          {showPagination &&
          <section className="pb-24 px-4 sm:px-6 lg:px-8">
              <div className="w-full max-w-[1440px] mx-auto">
                <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange} />

              </div>
            </section>
          }
        </main>

      {/* Modais */}
      <ToolModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTool(null);
        }}
        onSave={handleSaveTool}
        tool={editingTool}
        availableTags={CATEGORIES} />


      <AlertDialog open={!!deleteTool} onOpenChange={() => setDeleteTool(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a ferramenta "{deleteTool?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>);

}




