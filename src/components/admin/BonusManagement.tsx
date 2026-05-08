import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Eye, EyeOff, Plus, Shield, ExternalLink, Copy } from "lucide-react";
import { useBonusPages, BonusPage } from "@/hooks/useBonusPages";
import { BonusPageModal } from "./BonusPageModal";
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
import { useToast } from "@/hooks/use-toast";

export const BonusManagement = () => {
  const { pages, loading, addPage, updatePage, deletePage, toggleStatus } = useBonusPages();
  const { toast } = useToast();
  const [managementMode, setManagementMode] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'visible' | 'hidden'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<BonusPage | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<string | null>(null);

  const filteredPages = pages.filter((page) => {
    if (filterStatus === 'all') return true;
    return page.status === filterStatus;
  });

  const handleEdit = (page: BonusPage) => {
    setSelectedPage(page);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedPage(null);
    setModalOpen(true);
  };

  const handleSave = async (data: Omit<BonusPage, 'id' | 'created_at' | 'updated_at'>) => {
    if (selectedPage) {
      await updatePage(selectedPage.id, data);
    } else {
      await addPage(data);
    }
  };

  const handleDeleteClick = (id: string) => {
    setPageToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (pageToDelete) {
      await deletePage(pageToDelete);
      setPageToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleOpen = (slug: string) => {
    const url = `${window.location.origin}${slug}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link copiado",
        description: "O link da página foi copiado para a área de transferência.",
      });
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Carregando páginas de bônus...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Bônus da Newsletter</h2>
          <Badge variant="outline" className="gap-1">
            <Shield className="h-3 w-3" />
            noindex ativo
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="management-mode"
              checked={managementMode}
              onCheckedChange={setManagementMode}
            />
            <Label htmlFor="management-mode">Modo de Gerenciamento</Label>
          </div>

          <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as typeof filterStatus)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="visible">Visíveis</SelectItem>
              <SelectItem value="hidden">Ocultos</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Página
          </Button>
        </div>
      </div>

      {managementMode && (
        <div className="bg-muted/50 p-4 rounded-lg border border-muted">
          <p className="text-sm text-muted-foreground">
            Modo de gerenciamento ativo. Edite o conteúdo ou gerencie a visibilidade das páginas de bônus.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPages.map((page) => (
          <Card key={page.id} className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1 line-clamp-2">{page.title}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{page.slug}</p>
                  <Badge variant={page.status === 'visible' ? 'default' : 'secondary'}>
                    {page.status === 'visible' ? 'Visível' : 'Oculta'}
                  </Badge>
                </div>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                {page.intro}
              </p>

              <div className="text-xs text-muted-foreground mb-4">
                {page.cards.length} ferramenta(s) configurada(s)
              </div>

              {managementMode && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpen(page.slug)}
                      aria-label="Abrir página em nova aba"
                      className="flex-1"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Abrir
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyLink(page.slug)}
                      aria-label="Copiar link da página"
                      className="flex-1"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(page)}
                      aria-label="Editar página"
                      className="flex-1"
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleStatus(page.id, page.status)}
                      aria-label={page.status === 'visible' ? 'Ocultar' : 'Exibir'}
                      className="flex-1"
                    >
                      {page.status === 'visible' ? (
                        <EyeOff className="h-3 w-3 mr-1" />
                      ) : (
                        <Eye className="h-3 w-3 mr-1" />
                      )}
                      {page.status === 'visible' ? 'Ocultar' : 'Exibir'}
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteClick(page.id)}
                      aria-label="Excluir página"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPages.length === 0 && (
        <div className="text-center p-8 text-muted-foreground">
          Nenhuma página encontrada com os filtros selecionados.
        </div>
      )}

      <BonusPageModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        page={selectedPage}
        onSave={handleSave}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta página? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
