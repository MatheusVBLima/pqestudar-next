import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { X, Plus, RotateCcw, Save } from "lucide-react";
import { useSearchConfig, SearchConfig } from "@/hooks/useConcursosAdmin";
import { toast } from "sonner";

export default function ConcursosSearchConfig() {
  const { config, setConfig, resetConfig } = useSearchConfig();
  const [newWhitelistSite, setNewWhitelistSite] = useState("");
  const [newBlacklistSite, setNewBlacklistSite] = useState("");

  const updateConfig = (updates: Partial<SearchConfig>) => {
    setConfig({ ...config, ...updates });
  };

  const addToWhitelist = () => {
    const site = newWhitelistSite.trim().toLowerCase();
    if (site && !config.whitelist.includes(site)) {
      updateConfig({ whitelist: [...config.whitelist, site] });
      setNewWhitelistSite("");
      toast.success(`${site} adicionado à whitelist`);
    }
  };

  const removeFromWhitelist = (site: string) => {
    updateConfig({ whitelist: config.whitelist.filter((s) => s !== site) });
  };

  const addToBlacklist = () => {
    const site = newBlacklistSite.trim().toLowerCase();
    if (site && !config.blacklist.includes(site)) {
      updateConfig({ blacklist: [...config.blacklist, site] });
      setNewBlacklistSite("");
      toast.success(`${site} adicionado à blacklist`);
    }
  };

  const removeFromBlacklist = (site: string) => {
    updateConfig({ blacklist: config.blacklist.filter((s) => s !== site) });
  };

  const handleSave = () => {
    toast.success("Configurações salvas localmente!");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modo de Busca</CardTitle>
          <CardDescription>
            Defina como as buscas serão realizadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Modo</Label>
              <Select
                value={config.searchMode}
                onValueChange={(value: "whitelist" | "generic") =>
                  updateConfig({ searchMode: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whitelist">Sites selecionados (whitelist)</SelectItem>
                  <SelectItem value="generic">Busca genérica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ano Alvo</Label>
              <Input
                type="number"
                value={config.targetYear}
                onChange={(e) =>
                  updateConfig({ targetYear: parseInt(e.target.value) || new Date().getFullYear() })
                }
                min={2020}
                max={2030}
              />
              <p className="text-xs text-muted-foreground">
                Conteúdos fora deste ano serão ignorados
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Limite de URLs por rodada</Label>
              <Input
                type="number"
                value={config.urlLimit}
                onChange={(e) =>
                  updateConfig({ urlLimit: parseInt(e.target.value) || 20 })
                }
                min={1}
                max={100}
              />
            </div>

            <div className="space-y-2">
              <Label>Profundidade da busca</Label>
              <Input
                type="number"
                value={config.searchDepth}
                onChange={(e) =>
                  updateConfig({ searchDepth: parseInt(e.target.value) || 2 })
                }
                min={1}
                max={5}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tema/Consulta</Label>
            <Input
              placeholder="Ex: concursos públicos federais 2025"
              value={config.query}
              onChange={(e) => updateConfig({ query: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Whitelist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Whitelist de Sites</CardTitle>
          <CardDescription>
            Sites confiáveis para busca de informações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ex: gov.br"
              value={newWhitelistSite}
              onChange={(e) => setNewWhitelistSite(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addToWhitelist()}
            />
            <Button onClick={addToWhitelist} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {config.whitelist.map((site) => (
              <Badge key={site} variant="secondary" className="gap-1 pr-1">
                {site}
                <button
                  onClick={() => removeFromWhitelist(site)}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {config.whitelist.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                Nenhum site na whitelist
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Blacklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Blacklist de Sites</CardTitle>
          <CardDescription>
            Sites a serem ignorados nas buscas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ex: site-nao-confiavel.com"
              value={newBlacklistSite}
              onChange={(e) => setNewBlacklistSite(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addToBlacklist()}
            />
            <Button onClick={addToBlacklist} size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {config.blacklist.map((site) => (
              <Badge key={site} variant="outline" className="gap-1 pr-1 border-destructive/50 text-destructive">
                {site}
                <button
                  onClick={() => removeFromBlacklist(site)}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {config.blacklist.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                Nenhum site na blacklist
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={resetConfig}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Restaurar Padrões
        </Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}