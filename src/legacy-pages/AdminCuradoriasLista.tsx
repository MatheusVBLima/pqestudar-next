"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Search,
  Edit,
  Copy,
  Trash2,
  Link2,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useCurationsList, useCurationMutations, CurationPage } from "@/hooks/useCurations";
import { toast } from "@/hooks/use-toast";

export default function AdminCuradoriasLista() {
  const router = useRouter();
  const { isAdmin, loading: loadingRoles } = useUserRoles();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCuration, setDeletingCuration] = useState<CurationPage | null>(null);

  const { data: curations, isLoading } = useCurationsList({
    status: statusFilter,
    search: search || undefined,
  });

  const { delete: deleteMutation, duplicate: duplicateMutation } = useCurationMutations();

  const handleCopyLink = (curation: CurationPage) => {
    if (curation.status !== 'published') {
      toast({
        title: "Curadoria não publicada",
        description: "Publique a curadoria para gerar o link público.",
        variant: "destructive",
      });
      return;
    }

    const url = `${window.location.origin}/curadoria/${curation.slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copiado!",
      description: "O link foi copiado para a área de transferência.",
    });
  };

  const handleDelete = async () => {
    if (!deletingCuration) return;
    await deleteMutation.mutateAsync(deletingCuration.id);
    setDeleteDialogOpen(false);
    setDeletingCuration(null);
  };

  const handleDuplicate = async (curation: CurationPage) => {
    await duplicateMutation.mutateAsync(curation.id);
  };

  // Redireciona se não for admin
  if (!loadingRoles && !isAdmin) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Curadorias</h1>
            <p className="text-muted-foreground">
              Gerencie suas páginas de curadoria de ferramentas.
            </p>
          </div>
          <Button onClick={() => router.push("/admin/curadorias/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Curadoria
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="published">Publicado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading || loadingRoles ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !curations || curations.length === 0 ? (
          <div className="text-center py-16 border rounded-lg">
            <p className="text-muted-foreground mb-4">
              {search || statusFilter !== "all"
                ? "Nenhuma curadoria encontrada com esses filtros."
                : "Nenhuma curadoria criada ainda."}
            </p>
            {!search && statusFilter === "all" && (
              <Button onClick={() => router.push("/admin/curadorias/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira curadoria
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Atualizado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {curations.map((curation) => (
                  <TableRow key={curation.id}>
                    <TableCell className="font-medium">
                      {curation.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      /curadoria/{curation.slug}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={curation.status === "published" ? "default" : "secondary"}
                      >
                        {curation.status === "published" ? "Publicado" : "Rascunho"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(curation.updated_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/admin/curadorias/${curation.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(curation)}
                            disabled={duplicateMutation.isPending}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenuItem
                                  onClick={() => handleCopyLink(curation)}
                                  disabled={curation.status !== "published"}
                                >
                                  <Link2 className="h-4 w-4 mr-2" />
                                  Copiar link
                                </DropdownMenuItem>
                              </TooltipTrigger>
                              {curation.status !== "published" && (
                                <TooltipContent>
                                  Publique para gerar link público
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                          {curation.status === "published" && (
                            <DropdownMenuItem
                              onClick={() =>
                                window.open(`/curadoria/${curation.slug}`, "_blank")
                              }
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Ver página
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setDeletingCuration(curation);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
      

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir curadoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A curadoria "{deletingCuration?.title}" será
              permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
