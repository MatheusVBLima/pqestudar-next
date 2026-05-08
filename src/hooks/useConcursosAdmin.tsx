import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

// Types
export interface SearchConfig {
  searchMode: "whitelist" | "generic";
  whitelist: string[];
  blacklist: string[];
  query: string;
  targetYear: number;
  urlLimit: number;
  searchDepth: number;
}

export interface AntiRepetitionConfig {
  blockAnalyzedUrls: boolean;
  blockSimilarContent: boolean;
  blockSameOrganoTipo: boolean;
  themeBlockDays: number;
}

export interface AIOrchestrationConfig {
  engine: "manual" | "lovable" | "openai" | "other";
  enabledFunctions: {
    classify: boolean;
    extractFields: boolean;
    generateSummary: boolean;
    suggestTags: boolean;
    evaluateReliability: boolean;
  };
  basePrompt: string;
  maxTokensPerItem: number;
  maxItemsPerRound: number;
  timeoutMs: number;
}

export interface PendingItem {
  id: string;
  source_url: string;
  source_domain: string | null;
  source_title: string | null;
  collected_at: string;
  titulo_sugerido: string | null;
  ano_detectado: number | null;
  categoria_detectada: string | null;
  tipo_detectado: string | null;
  situacao_detectada: string | null;
  orgao_detectado: string | null;
  banca_detectada: string | null;
  escolaridade_detectada: string | null;
  abrangencia_detectada: string | null;
  resumo_editorial: string | null;
  link_edital: string | null;
  confiabilidade: number | null;
  ai_engine: string | null;
  status: "pending" | "approved" | "rejected" | "archived";
  rejection_reason: string | null;
  oportunidade_id: string | null;
  created_at: string;
}

export interface AnalyzedUrl {
  id: string;
  url_hash: string;
  url: string;
  content_hash: string | null;
  orgao: string | null;
  ano: number | null;
  tipo: string | null;
  situacao: string | null;
  tema: string | null;
  analyzed_at: string;
  ignored: boolean;
  ignore_reason: string | null;
}

// Default configs
const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  searchMode: "whitelist",
  whitelist: [
    "gov.br",
    "in.gov.br",
    "mec.gov.br",
    "inep.gov.br",
    "cebraspe.org.br",
    "fgv.br",
    "vunesp.com.br",
  ],
  blacklist: [],
  query: "",
  targetYear: new Date().getFullYear(),
  urlLimit: 20,
  searchDepth: 2,
};

const DEFAULT_ANTI_REPETITION_CONFIG: AntiRepetitionConfig = {
  blockAnalyzedUrls: true,
  blockSimilarContent: true,
  blockSameOrganoTipo: true,
  themeBlockDays: 30,
};

const DEFAULT_AI_CONFIG: AIOrchestrationConfig = {
  engine: "manual",
  enabledFunctions: {
    classify: false,
    extractFields: false,
    generateSummary: false,
    suggestTags: false,
    evaluateReliability: false,
  },
  basePrompt: `Você é um assistente especializado em concursos públicos e oportunidades educacionais no Brasil.

REGRAS OBRIGATÓRIAS:
1. Se não houver fonte oficial, responda "não informado".
2. NUNCA invente dados, datas ou informações.
3. Use linguagem: "Segundo informações divulgadas por..."
4. Priorize fontes: gov.br, diários oficiais, sites de bancas.
5. Se houver dúvida sobre a veracidade, marque como "não confirmado".`,
  maxTokensPerItem: 1000,
  maxItemsPerRound: 10,
  timeoutMs: 30000,
};

// Local storage helpers
const STORAGE_KEYS = {
  search: "concursos_search_config",
  antiRepetition: "concursos_anti_repetition_config",
  ai: "concursos_ai_config",
};

export function getLocalConfig<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setLocalConfig<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Failed to save config to localStorage:", e);
  }
}

// Hooks
export function useSearchConfig() {
  const [config, setConfigState] = useState<SearchConfig>(() =>
    getLocalConfig(STORAGE_KEYS.search, DEFAULT_SEARCH_CONFIG)
  );

  const setConfig = (newConfig: SearchConfig) => {
    setConfigState(newConfig);
    setLocalConfig(STORAGE_KEYS.search, newConfig);
  };

  const resetConfig = () => {
    setConfig(DEFAULT_SEARCH_CONFIG);
  };

  return { config, setConfig, resetConfig };
}

export function useAntiRepetitionConfig() {
  const [config, setConfigState] = useState<AntiRepetitionConfig>(() =>
    getLocalConfig(STORAGE_KEYS.antiRepetition, DEFAULT_ANTI_REPETITION_CONFIG)
  );

  const setConfig = (newConfig: AntiRepetitionConfig) => {
    setConfigState(newConfig);
    setLocalConfig(STORAGE_KEYS.antiRepetition, newConfig);
  };

  const resetConfig = () => {
    setConfig(DEFAULT_ANTI_REPETITION_CONFIG);
  };

  return { config, setConfig, resetConfig };
}

export function useAIOrchestrationConfig() {
  const [config, setConfigState] = useState<AIOrchestrationConfig>(() =>
    getLocalConfig(STORAGE_KEYS.ai, DEFAULT_AI_CONFIG)
  );

  const setConfig = (newConfig: AIOrchestrationConfig) => {
    setConfigState(newConfig);
    setLocalConfig(STORAGE_KEYS.ai, newConfig);
  };

  const resetConfig = () => {
    setConfig(DEFAULT_AI_CONFIG);
  };

  return { config, setConfig, resetConfig };
}

// Pending items hook
export function usePendingItems(statusFilter?: string) {
  const queryClient = useQueryClient();

  const {
    data: items = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["concursos-pending-items", statusFilter],
    staleTime: 90_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      let query = supabase
        .from("concursos_pending_items")
        .select("*")
        .order("collected_at", { ascending: false });

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as PendingItem[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      rejectionReason,
    }: {
      id: string;
      status: PendingItem["status"];
      rejectionReason?: string;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      
      const updateData: TablesUpdate<"concursos_pending_items"> = {
        status,
        curated_by: session?.session?.user?.id,
        curated_at: new Date().toISOString(),
      };

      if (rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }

      const { error } = await supabase
        .from("concursos_pending_items")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["concursos-pending-items"] });
      const messages: Record<string, string> = {
        approved: "Item aprovado com sucesso!",
        rejected: "Item rejeitado.",
        archived: "Item arquivado.",
        pending: "Item retornado para pendente.",
      };
      toast.success(messages[status] || "Status atualizado.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar status");
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("concursos_pending_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concursos-pending-items"] });
      toast.success("Item excluído.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao excluir item");
    },
  });

  const addItem = useMutation({
    mutationFn: async (item: Partial<PendingItem>) => {
      const payload = item as TablesInsert<"concursos_pending_items">;
      const { error } = await supabase
        .from("concursos_pending_items")
        .insert([payload]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concursos-pending-items"] });
      toast.success("Item adicionado para curadoria.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao adicionar item");
    },
  });

  return {
    items,
    isLoading,
    error,
    refetch,
    updateStatus: updateStatus.mutateAsync,
    deleteItem: deleteItem.mutateAsync,
    addItem: addItem.mutateAsync,
    isUpdating: updateStatus.isPending,
  };
}

// Analyzed URLs hook
export function useAnalyzedUrls() {
  const queryClient = useQueryClient();

  const {
    data: urls = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["concursos-analyzed-urls"],
    staleTime: 90_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concursos_analyzed_urls")
        .select("*")
        .order("analyzed_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as unknown as AnalyzedUrl[];
    },
  });

  const checkUrlExists = async (url: string): Promise<boolean> => {
    const urlHash = await hashString(url);
    const { data } = await supabase
      .from("concursos_analyzed_urls")
      .select("id")
      .eq("url_hash", urlHash)
      .single();

    return !!data;
  };

  const addAnalyzedUrl = useMutation({
    mutationFn: async (data: Partial<AnalyzedUrl> & { url: string }) => {
      const urlHash = await hashString(data.url);
      
      const { error } = await supabase
        .from("concursos_analyzed_urls")
        .upsert({
          ...data,
          url_hash: urlHash,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concursos-analyzed-urls"] });
    },
  });

  const clearOldUrls = useMutation({
    mutationFn: async (daysOld: number) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { error } = await supabase
        .from("concursos_analyzed_urls")
        .delete()
        .lt("analyzed_at", cutoffDate.toISOString());

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concursos-analyzed-urls"] });
      toast.success("URLs antigas removidas.");
    },
  });

  return {
    urls,
    isLoading,
    refetch,
    checkUrlExists,
    addAnalyzedUrl: addAnalyzedUrl.mutateAsync,
    clearOldUrls: clearOldUrls.mutateAsync,
  };
}

// Utility functions
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function normalizeAndHashContent(content: string): Promise<string> {
  // Normalize: lowercase, remove extra whitespace, remove punctuation
  const normalized = content
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim();

  return hashString(normalized);
}
