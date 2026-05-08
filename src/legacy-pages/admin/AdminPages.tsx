"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/dashboard/PageHeader";
import { useAllPageSettings, MANAGED_ROUTES } from "@/hooks/usePageSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Save, AlertTriangle } from "lucide-react";
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
        <PageHeader title="Page Settings" description="Gerencie título, meta description e hero de cada página." />
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Page Settings" description="Gerencie título, meta description e hero de cada página." />

      <div className="max-w-xs">
        <Label className="text-sm font-medium mb-2 block">Rota</Label>
        <Select value={selectedRoute} onValueChange={setSelectedRoute}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MANAGED_ROUTES.map((route) => (
              <SelectItem key={route} value={route}>
                {route}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="title_tag">Title tag</Label>
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
              placeholder="Ex: Ferramentas - PqEstudar"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="meta_description">Meta description</Label>
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
              placeholder="Descrição para mecanismos de busca"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="header_title">Header title (H1 do hero)</Label>
            <Input
              id="header_title"
              value={currentValues.header_title}
              onChange={(event) => setDraftField("header_title", event.target.value)}
              placeholder="Ex: Ferramentas"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="header_description">Header description (texto abaixo do H1)</Label>
            <Textarea
              id="header_description"
              value={currentValues.header_description}
              onChange={(event) => setDraftField("header_description", event.target.value)}
              placeholder="Ex: A curadoria completa das ferramentas..."
              rows={3}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={!canSave || isUpdating}>
              <Save className="h-4 w-4 mr-2" />
              {isUpdating ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
