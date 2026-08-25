"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/dashboard/PageHeader";
import { useAllPageSettings, MANAGED_ROUTES } from "@/hooks/usePageSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Save, AlertTriangle, FileSearch, Monitor, Route, Search, Sparkles } from "lucide-react";
import { getErrorMessage } from "@/lib/error-message";

interface RouteSettingsDraft {
  title_tag: string;
  meta_description: string;
  header_title: string;
  header_description: string;
}

export default function AdminPages() {
  const { allSettings, isLoading, updateSettings, isUpdating } = useAllPageSettings();
  const [selectedRoute, setSelectedRoute] = useState<string>(MANAGED_ROUTES[0]);
  const [draftsByRoute, setDraftsByRoute] = useState<Record<string, RouteSettingsDraft>>({});

  const currentStored = useMemo(
    () => allSettings.find((setting) => setting.route === selectedRoute) ?? null,
    [allSettings, selectedRoute]
  );
  const activeDraft = draftsByRoute[selectedRoute];
  const currentValues: RouteSettingsDraft = activeDraft ?? {
    title_tag: currentStored?.title_tag ?? "",
    meta_description: currentStored?.meta_description ?? "",
    header_title: currentStored?.header_title ?? "",
    header_description: currentStored?.header_description ?? "",
  };

  const canSave =
    currentValues.title_tag.trim() !== "" &&
    currentValues.meta_description.trim() !== "" &&
    currentValues.header_title.trim() !== "" &&
    currentValues.header_description.trim() !== "";
  const hasChanges = Boolean(activeDraft) && (
    currentValues.title_tag !== (currentStored?.title_tag ?? "") ||
    currentValues.meta_description !== (currentStored?.meta_description ?? "") ||
    currentValues.header_title !== (currentStored?.header_title ?? "") ||
    currentValues.header_description !== (currentStored?.header_description ?? "")
  );

  const setDraftField = (field: keyof RouteSettingsDraft, value: string) => {
    setDraftsByRoute((prev) => ({
      ...prev,
      [selectedRoute]: {
        ...currentValues,
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!canSave) return;
    try {
      await updateSettings({
        route: selectedRoute,
        title_tag: currentValues.title_tag.trim(),
        meta_description: currentValues.meta_description.trim(),
        header_title: currentValues.header_title.trim(),
        header_description: currentValues.header_description.trim(),
      });

      setDraftsByRoute((prev) => {
        const next = { ...prev };
        delete next[selectedRoute];
        return next;
      });

      toast({
        title: "Salvo com sucesso",
        description: `Configurações de ${selectedRoute} atualizadas.`,
      });
    } catch (error: unknown) {
      toast({
        title: "Erro ao salvar",
        description: getErrorMessage(error, "Tente novamente."),
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Configurações das páginas" description="Gerencie SEO e apresentação das páginas públicas." />
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações das páginas"
        description="Controle como cada página aparece no Google e para os visitantes do PqEstudar."
      />

      <section className="overflow-hidden rounded-[var(--admin-radius)] border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card shadow-[0_20px_60px_hsl(var(--primary)/0.08)]">
        <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <Route className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">Página em edição</p>
              <p className="mt-1 text-sm text-muted-foreground">Escolha uma rota para editar seu SEO e conteúdo principal.</p>
            </div>
          </div>
          <div className="w-full md:max-w-sm">
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rota pública</Label>
            <Select value={selectedRoute} onValueChange={setSelectedRoute}>
              <SelectTrigger className="h-12 border-primary/20 bg-background/75 px-4 shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MANAGED_ROUTES.map((route) => (
                  <SelectItem key={route} value={route}>{route}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="overflow-hidden border-border/70 bg-card/80">
          <CardHeader className="border-b border-border/60 bg-muted/20">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileSearch className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-lg">Busca e compartilhamento</CardTitle>
                <CardDescription className="mt-1">Título e descrição exibidos em buscadores e redes sociais.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-5 md:p-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="title_tag">Título SEO</Label>
              <div className="flex items-center gap-2">
                {currentValues.title_tag.length > 60 ? (
                  <Badge variant="outline" className="text-destructive border-destructive/30 gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {currentValues.title_tag.length}/60
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">{currentValues.title_tag.length}/60</span>
                )}
              </div>
            </div>
            <Input
              id="title_tag"
              value={currentValues.title_tag}
              onChange={(event) => setDraftField("title_tag", event.target.value)}
              placeholder="Ex.: Ferramentas educacionais | PqEstudar"
              className="h-12 bg-background/70 px-4"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="meta_description">Descrição SEO</Label>
              <div className="flex items-center gap-2">
                {currentValues.meta_description.length > 160 ? (
                  <Badge variant="outline" className="text-destructive border-destructive/30 gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {currentValues.meta_description.length}/160
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">{currentValues.meta_description.length}/160</span>
                )}
              </div>
            </div>
            <Textarea
              id="meta_description"
              value={currentValues.meta_description}
              onChange={(event) => setDraftField("meta_description", event.target.value)}
              placeholder="Descreva a página para mecanismos de busca."
              rows={4}
              className="bg-background/70 p-4"
            />
          </div>

          <div className="rounded-[var(--admin-radius)] border border-border/70 bg-background/65 p-4 shadow-inner">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Search className="h-3.5 w-3.5" />
              Prévia no buscador
            </div>
            <p className="truncate text-lg font-medium text-primary">{currentValues.title_tag || "Título da página"}</p>
            <p className="mt-1 truncate text-xs text-emerald-600 dark:text-emerald-400">pqestudar.com.br{selectedRoute}</p>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {currentValues.meta_description || "A descrição desta página aparecerá aqui."}
            </p>
          </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/70 bg-card/80">
          <CardHeader className="border-b border-border/60 bg-muted/20">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Monitor className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-lg">Apresentação da página</CardTitle>
                <CardDescription className="mt-1">Conteúdo principal exibido no topo da página pública.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-5 md:p-6">
          <div className="space-y-2">
            <Label htmlFor="header_title">Título principal (H1)</Label>
            <Input
              id="header_title"
              value={currentValues.header_title}
              onChange={(event) => setDraftField("header_title", event.target.value)}
              placeholder="Ex.: Ferramentas para estudar melhor"
              className="h-12 bg-background/70 px-4"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="header_description">Descrição de apresentação</Label>
            <Textarea
              id="header_description"
              value={currentValues.header_description}
              onChange={(event) => setDraftField("header_description", event.target.value)}
              placeholder="Explique rapidamente o que o visitante encontrará nesta página."
              rows={4}
              className="bg-background/70 p-4"
            />
          </div>

          <div className="relative overflow-hidden rounded-[var(--admin-radius)] border border-primary/20 bg-gradient-to-br from-card via-primary/10 to-primary/20 p-6 shadow-inner">
            <Sparkles className="absolute right-5 top-5 h-5 w-5 text-primary/40" />
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Prévia do destaque</p>
            <h3 className="mt-4 max-w-xl text-2xl font-bold leading-tight">
              {currentValues.header_title || "Título principal da página"}
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {currentValues.header_description || "A descrição principal será exibida aqui."}
            </p>
          </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 rounded-[var(--admin-radius)] border border-border/70 bg-card/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">{hasChanges ? "Alterações ainda não salvas" : "Configurações atualizadas"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasChanges ? "Revise as prévias e salve para publicar as mudanças." : `Você está visualizando as configurações de ${selectedRoute}.`}
          </p>
        </div>
        <Button className="h-11 min-w-36" onClick={handleSave} disabled={!canSave || !hasChanges || isUpdating}>
          <Save className="mr-2 h-4 w-4" />
          {isUpdating ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}
