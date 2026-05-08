import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Save, Bot, AlertCircle, CheckCircle2, AlertTriangle, Loader2, Wifi } from "lucide-react";
import { useAIOrchestrationConfig, AIOrchestrationConfig } from "@/hooks/useConcursosAdmin";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { PUBLIC_SUPABASE_URL } from "@/lib/runtime-env";

const AI_FUNCTIONS = [
  { id: "classify", label: "Classificar conteúdo", description: "Determina categoria e tipo" },
  { id: "extractFields", label: "Extrair campos", description: "Extrai órgão, banca, situação, datas" },
  { id: "generateSummary", label: "Gerar resumo editorial", description: "Cria texto informativo" },
  { id: "suggestTags", label: "Sugerir tags", description: "Sugere escolaridade, abrangência" },
  { id: "evaluateReliability", label: "Avaliar confiabilidade", description: "Pontua a fonte" },
] as const;

interface HealthCheckResult {
  status: "ok" | "warning" | "error";
  message: string;
  hasKey: boolean;
  model?: string;
  responseTimeMs?: number;
}

export default function ConcursosAIOrchestration() {
  const { config, setConfig, resetConfig } = useAIOrchestrationConfig();
  const [healthStatus, setHealthStatus] = useState<HealthCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const updateConfig = (updates: Partial<AIOrchestrationConfig>) => {
    setConfig({ ...config, ...updates });
  };

  const toggleFunction = (funcId: keyof AIOrchestrationConfig["enabledFunctions"]) => {
    updateConfig({
      enabledFunctions: {
        ...config.enabledFunctions,
        [funcId]: !config.enabledFunctions[funcId],
      },
    });
  };

  const handleSave = () => {
    toast.success("Configurações de IA salvas!");
  };

  const handleTestConnection = async () => {
    if (config.engine !== "openai") {
      toast.info("Teste de conexão disponível apenas para ChatGPT (OpenAI)");
      return;
    }

    setIsChecking(true);
    setHealthStatus(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      const response = await fetch(
        `${PUBLIC_SUPABASE_URL}/functions/v1/concursos-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ action: "healthcheck" }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setHealthStatus({
          status: "error",
          message: data.error || "Erro na requisição",
          hasKey: false,
        });
        return;
      }

      setHealthStatus(data);

      if (data.status === "ok") {
        toast.success(`Conexão OK! Modelo: ${data.model}`);
      } else if (data.status === "warning") {
        toast.warning(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      console.error("Healthcheck error:", err);
      setHealthStatus({
        status: "error",
        message: "Erro ao conectar com o servidor",
        hasKey: false,
      });
      toast.error("Erro ao testar conexão");
    } finally {
      setIsChecking(false);
    }
  };

  const isAIEnabled = config.engine !== "manual";
  const isOpenAI = config.engine === "openai";
  const hasEnabledFunctions = Object.values(config.enabledFunctions).some(Boolean);

  const getStatusIcon = () => {
    if (!healthStatus) return null;
    switch (healthStatus.status) {
      case "ok":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    if (!healthStatus) return "bg-muted";
    switch (healthStatus.status) {
      case "ok":
        return "bg-green-500/10 border-green-500/30";
      case "warning":
        return "bg-yellow-500/10 border-yellow-500/30";
      case "error":
        return "bg-red-500/10 border-red-500/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* Engine Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Motor de IA
          </CardTitle>
          <CardDescription>
            Selecione o motor de IA a ser utilizado. Padrão: Manual (sem IA)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Motor</Label>
            <Select
              value={config.engine}
              onValueChange={(value: AIOrchestrationConfig["engine"]) =>
                updateConfig({ engine: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">
                  <span className="flex items-center gap-2">
                    Manual (sem IA)
                    <Badge variant="secondary" className="text-xs">Padrão</Badge>
                  </span>
                </SelectItem>
                <SelectItem value="lovable">Lovable IA</SelectItem>
                <SelectItem value="openai">ChatGPT (OpenAI)</SelectItem>
                <SelectItem value="other" disabled>Outro (em breve)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.engine === "manual" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No modo manual, todos os campos devem ser preenchidos pelo administrador.
                A IA não será utilizada para classificação ou extração de dados.
              </AlertDescription>
            </Alert>
          )}

          {/* OpenAI-specific: Status & Test Connection */}
          {isOpenAI && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={isChecking}
                >
                  {isChecking ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Wifi className="h-4 w-4 mr-2" />
                  )}
                  Testar conexão
                </Button>

                {healthStatus && (
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${getStatusColor()}`}>
                    {getStatusIcon()}
                    <span className="text-sm">{healthStatus.message}</span>
                    {healthStatus.responseTimeMs && (
                      <Badge variant="outline" className="text-xs">
                        {healthStatus.responseTimeMs}ms
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {healthStatus && !healthStatus.hasKey && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Chave ausente</strong> — defina <code>OPENAI_API_KEY</code> no ambiente (Supabase Secrets).
                  </AlertDescription>
                </Alert>
              )}

              {healthStatus?.model && (
                <p className="text-sm text-muted-foreground">
                  Modelo configurado: <code className="bg-muted px-1 rounded">{healthStatus.model}</code>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Functions */}
      <Card className={!isAIEnabled ? "opacity-50" : ""}>
        <CardHeader>
          <CardTitle className="text-base">Funções Permitidas</CardTitle>
          <CardDescription>
            Selecione quais funções a IA pode executar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {AI_FUNCTIONS.map((func) => (
              <div
                key={func.id}
                className="flex items-start space-x-3 rounded-lg border p-3"
              >
                <Checkbox
                  id={func.id}
                  checked={config.enabledFunctions[func.id as keyof typeof config.enabledFunctions]}
                  onCheckedChange={() =>
                    toggleFunction(func.id as keyof typeof config.enabledFunctions)
                  }
                  disabled={!isAIEnabled}
                />
                <div className="flex-1">
                  <Label htmlFor={func.id} className="text-sm font-medium cursor-pointer">
                    {func.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{func.description}</p>
                </div>
              </div>
            ))}

            {isAIEnabled && !hasEnabledFunctions && (
              <p className="text-sm text-amber-600">
                ⚠️ Nenhuma função habilitada. A IA não executará nenhuma ação.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Base Prompt */}
      <Card className={!isAIEnabled ? "opacity-50" : ""}>
        <CardHeader>
          <CardTitle className="text-base">Prompt Base</CardTitle>
          <CardDescription>
            Instruções e regras que serão enviadas para a IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.basePrompt}
            onChange={(e) => updateConfig({ basePrompt: e.target.value })}
            rows={8}
            placeholder="Instruções para a IA..."
            disabled={!isAIEnabled}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Use linguagem clara e objetiva. A IA seguirá estas instruções ao processar cada item.
          </p>
        </CardContent>
      </Card>

      {/* Limits */}
      <Card className={!isAIEnabled ? "opacity-50" : ""}>
        <CardHeader>
          <CardTitle className="text-base">Limites de Execução</CardTitle>
          <CardDescription>
            Configure limites para controlar custos e tempo. Limites finais são definidos no servidor (ENV).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Máx. tokens por item</Label>
              <Input
                type="number"
                value={config.maxTokensPerItem}
                onChange={(e) =>
                  updateConfig({ maxTokensPerItem: parseInt(e.target.value) || 1000 })
                }
                min={100}
                max={4000}
                disabled={!isAIEnabled}
              />
              <p className="text-xs text-muted-foreground">Limite ENV: AI_MAX_TOKENS_PER_ITEM</p>
            </div>

            <div className="space-y-2">
              <Label>Máx. itens por rodada</Label>
              <Input
                type="number"
                value={config.maxItemsPerRound}
                onChange={(e) =>
                  updateConfig({ maxItemsPerRound: parseInt(e.target.value) || 10 })
                }
                min={1}
                max={50}
                disabled={!isAIEnabled}
              />
              <p className="text-xs text-muted-foreground">Limite ENV: AI_MAX_ITEMS_PER_ROUND</p>
            </div>

            <div className="space-y-2">
              <Label>Timeout (ms)</Label>
              <Input
                type="number"
                value={config.timeoutMs}
                onChange={(e) =>
                  updateConfig({ timeoutMs: parseInt(e.target.value) || 30000 })
                }
                min={5000}
                max={120000}
                step={1000}
                disabled={!isAIEnabled}
              />
              <p className="text-xs text-muted-foreground">Limite ENV: OPENAI_TIMEOUT_MS</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fallback info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fallback em Caso de Falha</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Se a IA falhar ou atingir o timeout, o item será marcado como{" "}
              <Badge variant="outline" className="mx-1">pendente</Badge>
              e exigirá revisão manual. <strong>Itens com falha de IA nunca são publicados automaticamente.</strong>
            </AlertDescription>
          </Alert>
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
