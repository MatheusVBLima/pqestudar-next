"use client";

import { useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { PageHeader } from "@/components/admin/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Plus,
  Save,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Link2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useLegalAdmin, type LegalSection } from "@/hooks/useLegalSections";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error-message";

const ROUTES = [
  { value: "/privacidade", label: "Privacidade" },
  { value: "/termos", label: "Termos de Uso" },
] as const;

export default function AdminLegal() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname() ?? "/admin/legal";
  const activeRoute = searchParams?.get("doc") || "/privacidade";
  const setActiveRoute = (r: string) => router.replace(`${pathname}?doc=${encodeURIComponent(r)}`);

  const {
    document: doc,
    sections,
    isLoading,
    updatePdfUrl,
    createSection,
    updateSection,
    deleteSection,
    toggleActive,
    reorder,
  } = useLegalAdmin(activeRoute);

  const [pdfUrlInput, setPdfUrlInput] = useState("");
  const [pdfUrlDirty, setPdfUrlDirty] = useState(false);

  // Modal state
  const [editingSection, setEditingSection] = useState<LegalSection | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync pdf_url input when doc changes
  const currentPdfUrl = doc?.pdf_url ?? "";
  if (!pdfUrlDirty && pdfUrlInput !== currentPdfUrl) {
    setPdfUrlInput(currentPdfUrl);
  }

  const handleSavePdf = async () => {
    try {
      await updatePdfUrl.mutateAsync(pdfUrlInput);
      setPdfUrlDirty(false);
      toast({ title: "PDF URL salvo com sucesso" });
    } catch (err: unknown) {
      toast({ title: "Erro ao salvar PDF URL", description: getErrorMessage(err), variant: "destructive" });
    }
  };

  const openCreate = () => {
    setEditingSection(null);
    setIsCreating(true);
    setFormTitle("");
    setFormContent("");
  };

  const openEdit = (s: LegalSection) => {
    setEditingSection(s);
    setIsCreating(true);
    setFormTitle(s.title);
    setFormContent(s.content);
  };

  const handleSaveSection = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    try {
      if (editingSection) {
        await updateSection.mutateAsync({
          id: editingSection.id,
          title: formTitle.trim(),
          content: formContent.trim(),
        });
        toast({ title: "Seção atualizada" });
      } else {
        await createSection.mutateAsync({
          title: formTitle.trim(),
          content: formContent.trim(),
        });
        toast({ title: "Seção criada" });
      }
      setIsCreating(false);
      setEditingSection(null);
    } catch (err: unknown) {
      toast({ title: "Erro ao salvar", description: getErrorMessage(err), variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteSection.mutateAsync(deletingId);
      toast({ title: "Seção excluída" });
    } catch (err: unknown) {
      toast({ title: "Erro ao excluir", description: getErrorMessage(err), variant: "destructive" });
    }
    setDeletingId(null);
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await toggleActive.mutateAsync({ id, is_active: !currentActive });
      toast({ title: !currentActive ? "Seção ativada" : "Seção ocultada" });
    } catch (err: unknown) {
      toast({ title: "Erro", description: getErrorMessage(err), variant: "destructive" });
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const newSections = [...sections];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newSections.length) return;
    [newSections[index], newSections[targetIdx]] = [newSections[targetIdx], newSections[index]];
    try {
      await reorder.mutateAsync(newSections.map((s) => s.id));
    } catch (err: unknown) {
      toast({ title: "Erro ao reordenar", description: getErrorMessage(err), variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Páginas Legais" description="Gerencie o conteúdo de Termos e Privacidade." />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Páginas Legais" description="Gerencie o conteúdo de Termos e Privacidade." />

      {/* Document selector */}
      <Tabs value={activeRoute} onValueChange={setActiveRoute}>
        <TabsList>
          {ROUTES.map((r) => (
            <TabsTrigger key={r.value} value={r.value} className="gap-2">
              <FileText className="h-4 w-4" />
              {r.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* PDF URL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            PDF URL (botão Imprimir/PDF)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={pdfUrlInput}
              onChange={(e) => {
                setPdfUrlInput(e.target.value);
                setPdfUrlDirty(true);
              }}
              placeholder="https://exemplo.com/termos.pdf"
              className="flex-1"
            />
            <Button
              onClick={handleSavePdf}
              disabled={updatePdfUrl.isPending || !pdfUrlDirty}
              size="sm"
            >
              <Save className="h-4 w-4 mr-1" />
              Salvar
            </Button>
          </div>
          {!pdfUrlInput && (
            <p className="text-xs text-muted-foreground mt-2">
              Sem PDF configurado — o botão ficará desabilitado na página pública.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sections */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Seções ({sections.length})</CardTitle>
          <Button size="sm" onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Seção
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {sections.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma seção encontrada. Crie a primeira seção acima.
            </p>
          )}
          {sections.map((section, idx) => (
            <div
              key={section.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                !section.is_active && "opacity-60 bg-muted/30"
              )}
            >
              {/* Reorder */}
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={idx === 0}
                  onClick={() => handleMove(idx, "up")}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={idx === sections.length - 1}
                  onClick={() => handleMove(idx, "down")}
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{section.title}</span>
                  {!section.is_active && (
                    <Badge variant="outline" className="text-xs">
                      Oculta
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  Ordem: {section.sort_order}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleToggle(section.id, section.is_active)}
                  title={section.is_active ? "Ocultar" : "Exibir"}
                >
                  {section.is_active ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEdit(section)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setDeletingId(section.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSection ? "Editar Seção" : "Nova Seção"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="section-title">Título *</Label>
              <Input
                id="section-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ex: 1. Aceitação dos Termos"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="section-content">Conteúdo (HTML) *</Label>
              <Textarea
                id="section-content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="<p>Conteúdo da seção...</p>"
                rows={12}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveSection}
              disabled={
                createSection.isPending || updateSection.isPending ||
                !formTitle.trim() || !formContent.trim()
              }
            >
              <Save className="h-4 w-4 mr-1" />
              {createSection.isPending || updateSection.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir seção?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A seção será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
