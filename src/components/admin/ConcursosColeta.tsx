import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Loader2, Globe, Search, FileText, ExternalLink, AlertCircle, CheckCircle2, XCircle, 
  ChevronDown, ChevronUp, History, Trash2, RefreshCw, Eye, X, Plus, Settings
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSearchConfig } from "@/hooks/useConcursosAdmin";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ColetaRunDrillDownSheet from "./ColetaRunDrillDownSheet";
import { PUBLIC_SUPABASE_URL } from "@/lib/runtime-env";

type ColetaMethod = "crawler" | "busca" | "manual";
type ColetaStatus = "pronto" | "coletando" | "concluido" | "falhou";

interface ColetaConfig {
  id: string;
  tema_consulta: string | null;
  ano_alvo: number;
  profundidade: number;
  limite_paginas: number;
  limite_resultados: number;
  extensoes_bloqueadas: string[];
  caminhos_bloqueados: string[];
  caminhos_permitidos: string[];
}

interface ColetaRun {
  id: string;
  executed_at: string;
  tipo_coleta: string;
  sites_env: string[];
  tema_consulta: string | null;
  ano_alvo: number;
  profundidade: number | null;
  limite_paginas: number | null;
  limite_resultados: number | null;
  filtros_snapshot: Record<string, unknown>;
  total_urls: number;
  total_novas: number;
  total_ignoradas: number;
  total_erros: number;
  status_execucao: string;
}

interface ColetaResult {
  url: string;
  dominio: string;
  tipo_pagina: string;
  status: "novo" | "ignorado" | "erro";
  motivo?: string;
  textoLength?: number;
}

interface ColetaSummary {
  total: number;
  novos: number;
  ignorados: number;
  erros: number;
}

export default function ConcursosColeta() {
  const queryClient = useQueryClient();
  const { config: searchConfig } = useSearchConfig();
  const [method, setMethod] = useState<ColetaMethod>("crawler");
  const [status, setStatus] = useState<ColetaStatus>("pronto");
  
  // Config state (loaded from backend)
  const [configLoaded, setConfigLoaded] = useState(false);
  const [extensoesBloqueadas, setExtensoesBloqueadas] = useState<string[]>([]);
  const [caminhosBloqueados, setCaminhosBloqueados] = useState<string[]>([]);
  const [caminhosPermitidos, setCaminhosPermitidos] = useState<string[]>([]);
  const [newExtensao, setNewExtensao] = useState("");
  const [newCaminhoBloq, setNewCaminhoBloq] = useState("");
  const [newCaminhoPerm, setNewCaminhoPerm] = useState("");
  
  // Crawler options
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [depth, setDepth] = useState(2);
  const [pageLimit, setPageLimit] = useState(50);
  const [ignoreAnalyzed, setIgnoreAnalyzed] = useState(true);
  const [ignoreNoDate, setIgnoreNoDate] = useState(true);
  const [ignoreOutOfYear, setIgnoreOutOfYear] = useState(true);
  
  // Busca options
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLimit, setSearchLimit] = useState(20);
  
  // Manual options
  const [manualUrls, setManualUrls] = useState("");
  const [metaObs, setMetaObs] = useState("");
  
  // Target year
  const [anoAlvo, setAnoAlvo] = useState(new Date().getFullYear());
  
  // Results
  const [results, setResults] = useState<ColetaResult[]>([]);
  const [summary, setSummary] = useState<ColetaSummary | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // History drill-down (now uses Sheet modal)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  
  // Collapsible sections
  const [rulesOpen, setRulesOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(true);

  // Fetch config from backend
  const { data: backendConfig, refetch: refetchConfig } = useQuery({
    queryKey: ["coleta-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coleta_config")
        .select("*")
        .eq("escopo", "concursos")
        .single();
      
      if (error) throw error;
      return data as unknown as ColetaConfig;
    }
  });

  // Load config into state
  useEffect(() => {
    if (backendConfig && !configLoaded) {
      setExtensoesBloqueadas(backendConfig.extensoes_bloqueadas || []);
      setCaminhosBloqueados(backendConfig.caminhos_bloqueados || []);
      setCaminhosPermitidos(backendConfig.caminhos_permitidos || []);
      setAnoAlvo(backendConfig.ano_alvo || new Date().getFullYear());
      setDepth(backendConfig.profundidade || 2);
      setPageLimit(backendConfig.limite_paginas || 50);
      setSearchLimit(backendConfig.limite_resultados || 20);
      setSearchQuery(backendConfig.tema_consulta || "");
      setConfigLoaded(true);
    }
  }, [backendConfig, configLoaded]);

  // Save config mutation
  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("coleta_config")
        .update({
          extensoes_bloqueadas: extensoesBloqueadas,
          caminhos_bloqueados: caminhosBloqueados,
          caminhos_permitidos: caminhosPermitidos,
          ano_alvo: anoAlvo,
          profundidade: depth,
          limite_paginas: pageLimit,
          limite_resultados: searchLimit,
          tema_consulta: searchQuery || null,
        })
        .eq("escopo", "concursos");
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuração salva");
      refetchConfig();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar configuração");
    }
  });

  // Fetch history runs
  const { data: historyRuns = [], refetch: refetchHistory } = useQuery({
    queryKey: ["coleta-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coleta_runs")
        .select("*")
        .order("executed_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data || []) as unknown as ColetaRun[];
    }
  });

  // Open drill-down sheet
  const openDrillDown = useCallback((runId: string) => {
    setSelectedRunId(runId);
    setDrillDownOpen(true);
  }, []);

  // Handle replay from drill-down sheet
  const handleReplayFromSheet = useCallback((run: ColetaRun) => {
    setMethod(run.tipo_coleta as ColetaMethod);
    setSelectedSites(Array.isArray(run.sites_env) ? run.sites_env : []);
    setAnoAlvo(run.ano_alvo);
    setSearchQuery(run.tema_consulta || "");
    if (run.profundidade) setDepth(run.profundidade);
    if (run.limite_paginas) setPageLimit(run.limite_paginas);
    if (run.limite_resultados) setSearchLimit(run.limite_resultados);
    
    const snapshot = run.filtros_snapshot as Record<string, unknown> | null;
    if (snapshot) {
      if (Array.isArray(snapshot.extensoes_bloqueadas)) {
        setExtensoesBloqueadas(snapshot.extensoes_bloqueadas as string[]);
      }
      if (Array.isArray(snapshot.caminhos_bloqueados)) {
        setCaminhosBloqueados(snapshot.caminhos_bloqueados as string[]);
      }
      if (Array.isArray(snapshot.caminhos_permitidos)) {
        setCaminhosPermitidos(snapshot.caminhos_permitidos as string[]);
      }
    }
    
    toast.info("Configuração carregada. Clique em 'Executar Coleta' para rodar.");
  }, []);

  // Delete run mutation
  const deleteRunMutation = useMutation({
    mutationFn: async (runId: string) => {
      const { error } = await supabase
        .from("coleta_runs")
        .delete()
        .eq("id", runId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Histórico excluído");
      refetchHistory();
      setSelectedRunId(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir histórico");
    }
  });

  const whitelist = searchConfig.whitelist || [];

  const handleSiteToggle = (site: string) => {
    setSelectedSites(prev => 
      prev.includes(site) ? prev.filter(s => s !== site) : [...prev, site]
    );
  };

  const selectAllSites = () => setSelectedSites([...whitelist]);
  const clearAllSites = () => setSelectedSites([]);

  const addChip = (
    value: string, 
    setter: React.Dispatch<React.SetStateAction<string[]>>, 
    inputSetter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const trimmed = value.trim();
    if (trimmed) {
      setter(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
      inputSetter("");
    }
  };

  const removeChip = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => prev.filter(v => v !== value));
  };

  const executeColeta = async () => {
    setStatus("coletando");
    setResults([]);
    setSummary(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Sessão expirada. Faça login novamente.");
        setStatus("falhou");
        return;
      }

      let payload: Record<string, unknown> = {
        action: method,
        anoAlvo,
        ignoreAnalyzed,
        ignoreNoDate,
        ignoreOutOfYear,
        extensoesBloqueadas,
        caminhosBloqueados,
        caminhosPermitidos,
      };

      if (method === "crawler") {
        if (selectedSites.length === 0) {
          toast.error("Selecione pelo menos um site da whitelist.");
          setStatus("pronto");
          return;
        }
        payload = {
          ...payload,
          sites: selectedSites,
          depth,
          limit: pageLimit,
        };
      } else if (method === "busca") {
        if (selectedSites.length === 0) {
          toast.error("Selecione pelo menos um site para busca.");
          setStatus("pronto");
          return;
        }
        payload = {
          ...payload,
          sites: selectedSites,
          query: searchQuery,
          limit: searchLimit,
        };
      } else if (method === "manual") {
        const urls = manualUrls
          .split("\n")
          .map(u => u.trim())
          .filter(u => u.startsWith("http"));
        
        if (urls.length === 0) {
          toast.error("Cole pelo menos uma URL válida (http/https).");
          setStatus("pronto");
          return;
        }
        payload = {
          ...payload,
          urls,
          metaObs,
        };
      }

      console.debug("[Coleta UI] Executing:", { method, ...payload });

      const response = await fetch(
        `${PUBLIC_SUPABASE_URL}/functions/v1/concursos-coleta`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro na coleta");
      }

      setResults(data.results || []);
      setSummary(data.summary || null);
      setStatus("concluido");
      refetchHistory();
      queryClient.invalidateQueries({ queryKey: ["itens-brutos-count"] });

      if (data.summary) {
        toast.success(`Coleta concluída: ${data.summary.novos} novos, ${data.summary.ignorados} ignorados, ${data.summary.erros} erros`);
      }
    } catch (error) {
      console.error("[Coleta UI] Error:", error);
      toast.error(error instanceof Error ? error.message : "Erro na coleta");
      setStatus("falhou");
    }
  };

  const replayRun = (run: ColetaRun) => {
    setMethod(run.tipo_coleta as ColetaMethod);
    const sitesEnv = Array.isArray(run.sites_env) ? run.sites_env : [];
    setSelectedSites(sitesEnv);
    setAnoAlvo(run.ano_alvo);
    setSearchQuery(run.tema_consulta || "");
    if (run.profundidade) setDepth(run.profundidade);
    if (run.limite_paginas) setPageLimit(run.limite_paginas);
    if (run.limite_resultados) setSearchLimit(run.limite_resultados);
    
    const snapshot = run.filtros_snapshot as Record<string, unknown> | null;
    if (snapshot) {
      if (Array.isArray(snapshot.extensoes_bloqueadas)) {
        setExtensoesBloqueadas(snapshot.extensoes_bloqueadas as string[]);
      }
      if (Array.isArray(snapshot.caminhos_bloqueados)) {
        setCaminhosBloqueados(snapshot.caminhos_bloqueados as string[]);
      }
      if (Array.isArray(snapshot.caminhos_permitidos)) {
        setCaminhosPermitidos(snapshot.caminhos_permitidos as string[]);
      }
    }
    
    toast.info("Configuração carregada. Clique em 'Executar Coleta' para rodar.");
    setDrillDownOpen(false);
  };

  const paginatedResults = results.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(results.length / itemsPerPage);

  const paginatedHistory = historyRuns.slice(
    (historyPage - 1) * 5,
    historyPage * 5
  );
  const totalHistoryPages = Math.ceil(historyRuns.length / 5);


  const getStatusIcon = (s: string) => {
    switch (s) {
      case "novo": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "ignorado": return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case "erro": return <XCircle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "novo": return <Badge variant="default" className="bg-emerald-600">Novo</Badge>;
      case "ignorado": return <Badge variant="secondary">Ignorado</Badge>;
      case "erro": return <Badge variant="destructive">Erro</Badge>;
      case "ok": return <Badge variant="default" className="bg-emerald-600">OK</Badge>;
      case "parcial": return <Badge variant="secondary">Parcial</Badge>;
      default: return <Badge variant="outline">{s}</Badge>;
    }
  };

  const getTypeBadge = (t: string) => {
    switch (t) {
      case "listagem": return <Badge variant="outline" className="text-xs">Listagem</Badge>;
      case "detalhe": return <Badge variant="default" className="text-xs">Detalhe</Badge>;
      default: return <Badge variant="outline" className="text-xs">{t}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Coleta de Dados Brutos</h3>
          <p className="text-sm text-muted-foreground">
            Entrada de dados ANTES da IA. Não organiza, não publica.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => saveConfigMutation.mutate()}
          disabled={saveConfigMutation.isPending}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          {saveConfigMutation.isPending ? "Salvando..." : "Salvar Config"}
        </Button>
      </div>

      <Separator />

      {/* Year selector */}
      <div className="flex items-center gap-4">
        <Label htmlFor="anoAlvo">Ano Alvo:</Label>
        <Select value={String(anoAlvo)} onValueChange={v => setAnoAlvo(Number(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* REGRAS DE COLETA (Collapsible) */}
      <Collapsible open={rulesOpen} onOpenChange={setRulesOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Regras de Coleta (Bloqueios)</CardTitle>
                {rulesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
              <CardDescription>Extensões e caminhos bloqueados/permitidos (persistente)</CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {/* Extensões Bloqueadas */}
              <div className="space-y-2">
                <Label>Extensões Bloqueadas</Label>
                <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[40px] bg-muted/30">
                  {extensoesBloqueadas.map(ext => (
                    <Badge key={ext} variant="secondary" className="gap-1">
                      {ext}
                      <button onClick={() => removeChip(ext, setExtensoesBloqueadas)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder=".pdf, .doc, etc."
                    value={newExtensao}
                    onChange={e => setNewExtensao(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addChip(newExtensao, setExtensoesBloqueadas, setNewExtensao)}
                    className="flex-1"
                  />
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => addChip(newExtensao, setExtensoesBloqueadas, setNewExtensao)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  URLs terminando nessas extensões serão descartadas imediatamente.
                </p>
              </div>

              {/* Caminhos Bloqueados */}
              <div className="space-y-2">
                <Label>Caminhos Bloqueados</Label>
                <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[40px] bg-muted/30">
                  {caminhosBloqueados.map(path => (
                    <Badge key={path} variant="secondary" className="gap-1">
                      {path}
                      <button onClick={() => removeChip(path, setCaminhosBloqueados)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="/wp-content, /assets, etc."
                    value={newCaminhoBloq}
                    onChange={e => setNewCaminhoBloq(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addChip(newCaminhoBloq, setCaminhosBloqueados, setNewCaminhoBloq)}
                    className="flex-1"
                  />
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => addChip(newCaminhoBloq, setCaminhosBloqueados, setNewCaminhoBloq)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  URLs contendo esses caminhos serão descartadas.
                </p>
              </div>

              {/* Caminhos Permitidos */}
              <div className="space-y-2">
                <Label>Caminhos Permitidos (opcional)</Label>
                <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[40px] bg-muted/30">
                  {caminhosPermitidos.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Vazio = permite todos os caminhos não bloqueados</span>
                  ) : (
                    caminhosPermitidos.map(path => (
                      <Badge key={path} variant="default" className="gap-1">
                        {path}
                        <button onClick={() => removeChip(path, setCaminhosPermitidos)}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="/concursos, /editais, etc."
                    value={newCaminhoPerm}
                    onChange={e => setNewCaminhoPerm(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addChip(newCaminhoPerm, setCaminhosPermitidos, setNewCaminhoPerm)}
                    className="flex-1"
                  />
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => addChip(newCaminhoPerm, setCaminhosPermitidos, setNewCaminhoPerm)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Se preenchido, a URL deve conter ao menos um desses caminhos.
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Method selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tipo de Coleta</CardTitle>
          <CardDescription>Selecione o método de coleta de dados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={method === "crawler" ? "default" : "outline"}
              onClick={() => setMethod("crawler")}
              className="gap-2"
            >
              <Globe className="h-4 w-4" />
              Crawler (Whitelist)
            </Button>
            <Button
              variant={method === "busca" ? "default" : "outline"}
              onClick={() => setMethod("busca")}
              className="gap-2"
            >
              <Search className="h-4 w-4" />
              Busca Genérica
            </Button>
            <Button
              variant={method === "manual" ? "default" : "outline"}
              onClick={() => setMethod("manual")}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Manual (Colar URLs)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic parameters based on method */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Parâmetros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Crawler options */}
          {method === "crawler" && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Sites Permitidos (Whitelist)</Label>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAllSites}>
                      Selecionar todos
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearAllSites}>
                      Limpar
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[60px] bg-muted/30">
                  {whitelist.length === 0 ? (
                    <span className="text-sm text-muted-foreground">
                      Nenhum site na whitelist. Configure em "Config. de Busca".
                    </span>
                  ) : (
                    whitelist.map(site => (
                      <Badge
                        key={site}
                        variant={selectedSites.includes(site) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleSiteToggle(site)}
                      >
                        {site}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="depth">Profundidade Máxima (1-3)</Label>
                  <Select value={String(depth)} onValueChange={v => setDepth(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Página inicial</SelectItem>
                      <SelectItem value="2">2 - Links diretos</SelectItem>
                      <SelectItem value="3">3 - 2 níveis de links</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pageLimit">Limite de páginas</Label>
                  <Input
                    id="pageLimit"
                    type="number"
                    min={1}
                    max={200}
                    value={pageLimit}
                    onChange={e => setPageLimit(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Filtros</Label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="ignoreAnalyzed"
                      checked={ignoreAnalyzed}
                      onCheckedChange={c => setIgnoreAnalyzed(!!c)}
                    />
                    <Label htmlFor="ignoreAnalyzed" className="font-normal">
                      Ignorar URLs já analisadas
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="ignoreNoDate"
                      checked={ignoreNoDate}
                      onCheckedChange={c => setIgnoreNoDate(!!c)}
                    />
                    <Label htmlFor="ignoreNoDate" className="font-normal">
                      Ignorar páginas sem data
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="ignoreOutOfYear"
                      checked={ignoreOutOfYear}
                      onCheckedChange={c => setIgnoreOutOfYear(!!c)}
                    />
                    <Label htmlFor="ignoreOutOfYear" className="font-normal">
                      Ignorar conteúdos fora do ano alvo
                    </Label>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Busca options */}
          {method === "busca" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="searchQuery">Consulta (tema)</Label>
                <Input
                  id="searchQuery"
                  placeholder="Ex: edital 2026 estadual"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Sites Incluídos</Label>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAllSites}>
                      Selecionar todos
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearAllSites}>
                      Limpar
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[60px] bg-muted/30">
                  {whitelist.length === 0 ? (
                    <span className="text-sm text-muted-foreground">
                      Nenhum site na whitelist. Configure em "Config. de Busca".
                    </span>
                  ) : (
                    whitelist.map(site => (
                      <Badge
                        key={site}
                        variant={selectedSites.includes(site) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleSiteToggle(site)}
                      >
                        {site}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="searchLimit">Limite de resultados</Label>
                <Input
                  id="searchLimit"
                  type="number"
                  min={1}
                  max={100}
                  value={searchLimit}
                  onChange={e => setSearchLimit(Number(e.target.value))}
                />
              </div>
            </>
          )}

          {/* Manual options */}
          {method === "manual" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="manualUrls">URLs (uma por linha)</Label>
                <Textarea
                  id="manualUrls"
                  placeholder="https://exemplo.gov.br/edital-123&#10;https://outro.gov.br/concurso"
                  value={manualUrls}
                  onChange={e => setManualUrls(e.target.value)}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  Cole URLs válidas (http/https). Cada linha será processada individualmente.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaObs">Observação interna (opcional)</Label>
                <Input
                  id="metaObs"
                  placeholder="Ex: Indicação do usuário X"
                  value={metaObs}
                  onChange={e => setMetaObs(e.target.value)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Execute button */}
      <div className="flex items-center gap-4">
        <Button
          onClick={executeColeta}
          disabled={status === "coletando"}
          className="gap-2"
        >
          {status === "coletando" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Coletando...
            </>
          ) : (
            <>Executar Coleta ({method})</>
          )}
        </Button>

        <div className="text-sm">
          {status === "pronto" && (
            <span className="text-muted-foreground">Pronto para coletar</span>
          )}
          {status === "coletando" && (
            <span className="text-primary">Processando...</span>
          )}
          {status === "concluido" && (
            <span className="text-emerald-600 dark:text-emerald-400">Concluído</span>
          )}
          {status === "falhou" && (
            <span className="text-destructive">Falhou</span>
          )}
        </div>
      </div>

      {/* Results */}
      {summary && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resultados da Rodada</CardTitle>
              <CardDescription>
                Total: {summary.total} | 
                <span className="text-emerald-600 dark:text-emerald-400 ml-1">{summary.novos} novos</span> | 
                <span className="text-amber-600 dark:text-amber-400 ml-1">{summary.ignorados} ignorados</span> | 
                <span className="text-destructive ml-1">{summary.erros} erros</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum resultado nesta rodada.
                </p>
              ) : (
                <>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Status</TableHead>
                          <TableHead className="w-16">Tipo</TableHead>
                          <TableHead>URL</TableHead>
                          <TableHead className="hidden md:table-cell">Motivo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedResults.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell>{getStatusIcon(r.status)}</TableCell>
                            <TableCell>{getTypeBadge(r.tipo_pagina)}</TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              <a
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline text-primary flex items-center gap-1"
                              >
                                <span className="truncate">{r.url}</span>
                                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              </a>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {r.motivo || (r.textoLength ? `${r.textoLength} caracteres` : "-")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-sm text-muted-foreground">
                        Mostrando {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, results.length)} de {results.length}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Próxima
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* HISTÓRICO DE COLETAS */}
      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  <CardTitle className="text-base">Histórico de Coletas</CardTitle>
                </div>
                {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
              <CardDescription>Execuções anteriores com detalhes e replay</CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {historyRuns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma coleta realizada ainda.
                </p>
              ) : (
                <>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="hidden sm:table-cell">Sites</TableHead>
                          <TableHead className="hidden md:table-cell">Ano</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-24">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedHistory.map((run) => (
                          <TableRow key={run.id}>
                            <TableCell className="text-xs">
                              {new Date(run.executed_at).toLocaleString("pt-BR")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{run.tipo_coleta}</Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-xs">
                              {(run.sites_env || []).slice(0, 2).join(", ")}
                              {(run.sites_env || []).length > 2 && "..."}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{run.ano_alvo}</TableCell>
                            <TableCell className="text-xs">
                              <span className="text-emerald-600">{run.total_novas}</span>/
                              <span className="text-amber-600">{run.total_ignoradas}</span>/
                              <span className="text-destructive">{run.total_erros}</span>
                            </TableCell>
                            <TableCell>{getStatusBadge(run.status_execucao)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => openDrillDown(run.id)}
                                  title="Ver detalhes"
                                  aria-label={`Ver detalhes da execução de ${new Date(run.executed_at).toLocaleDateString("pt-BR")}`}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => replayRun(run)}
                                  title="Reexecutar com mesmas configs"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => deleteRunMutation.mutate(run.id)}
                                  title="Excluir histórico"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {totalHistoryPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-sm text-muted-foreground">
                        Página {historyPage} de {totalHistoryPages}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                          disabled={historyPage === 1}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                          disabled={historyPage === totalHistoryPages}
                        >
                          Próxima
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Drill-down Sheet modal */}
      <ColetaRunDrillDownSheet
        runId={selectedRunId}
        open={drillDownOpen}
        onOpenChange={(open) => {
          setDrillDownOpen(open);
          if (!open) setSelectedRunId(null);
        }}
        onReplay={handleReplayFromSheet}
      />

      {/* Note */}
      <p className="text-xs text-muted-foreground">
        Nota: A aba "Coleta" apenas salva matéria-prima. A curadoria, anti-repetição e IA acontecem nas abas dedicadas.
      </p>
    </div>
  );
}
