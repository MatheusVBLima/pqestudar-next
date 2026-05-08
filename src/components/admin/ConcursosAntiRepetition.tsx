import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Save, Trash2, Shield, AlertTriangle } from "lucide-react";
import { useAntiRepetitionConfig, useAnalyzedUrls } from "@/hooks/useConcursosAdmin";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ConcursosAntiRepetition() {
  const { config, setConfig, resetConfig } = useAntiRepetitionConfig();
  const { urls, isLoading, clearOldUrls } = useAnalyzedUrls();

  const handleSave = () => {
    toast.success("Configurações de anti-repetição salvas!");
  };

  const handleClearOld = async () => {
    if (confirm("Remover URLs analisadas há mais de 90 dias?")) {
      await clearOldUrls(90);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Regras de Anti-Repetição
          </CardTitle>
          <CardDescription>
            Configure como evitar conteúdo duplicado antes de chamar a IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label className="text-sm font-medium">Bloquear URLs já analisadas</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  URLs que já passaram pelo sistema serão ignoradas (hash da URL)
                </p>
              </div>
              <Switch
                checked={config.blockAnalyzedUrls}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, blockAnalyzedUrls: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label className="text-sm font-medium">Bloquear conteúdo similar</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Conteúdos com hash textual idêntico ou muito similar serão ignorados
                </p>
              </div>
              <Switch
                checked={config.blockSimilarContent}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, blockSimilarContent: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label className="text-sm font-medium">Bloquear mesmo órgão + ano + tipo</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Evita duplicatas com mesma combinação de órgão, ano, tipo e situação
                </p>
              </div>
              <Switch
                checked={config.blockSameOrganoTipo}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, blockSameOrganoTipo: checked })
                }
              />
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <Label className="text-sm font-medium">Bloqueio de tema por período</Label>
              <p className="text-xs text-muted-foreground">
                Evita repetição do mesmo tema por X dias
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="number"
                  value={config.themeBlockDays}
                  onChange={(e) =>
                    setConfig({ ...config, themeBlockDays: parseInt(e.target.value) || 30 })
                  }
                  className="w-24"
                  min={1}
                  max={365}
                />
                <span className="text-sm text-muted-foreground">dias</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analyzed URLs stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">URLs Analisadas</CardTitle>
          <CardDescription>
            Histórico de URLs processadas pelo sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{urls.length} URLs registradas</Badge>
              {urls.filter(u => u.ignored).length > 0 && (
                <Badge variant="outline" className="text-amber-600 border-amber-600/30">
                  {urls.filter(u => u.ignored).length} ignoradas
                </Badge>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleClearOld}>
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar antigas (+90d)
            </Button>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : urls.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Nenhuma URL analisada ainda
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2">
              {urls.slice(0, 20).map((url) => (
                <div
                  key={url.id}
                  className={`text-xs p-2 rounded border ${
                    url.ignored ? "bg-amber-500/5 border-amber-500/20" : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <a
                      href={url.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate flex-1"
                    >
                      {url.url}
                    </a>
                    <span className="text-muted-foreground shrink-0">
                      {format(new Date(url.analyzed_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  {url.ignored && url.ignore_reason && (
                    <div className="flex items-center gap-1 mt-1 text-amber-600">
                      <AlertTriangle className="h-3 w-3" />
                      <span>{url.ignore_reason}</span>
                    </div>
                  )}
                </div>
              ))}
              {urls.length > 20 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  +{urls.length - 20} URLs não exibidas
                </p>
              )}
            </div>
          )}
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