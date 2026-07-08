"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Bot,
  BookOpenCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Copy,
  Coins,
  FileCheck2,
  GraduationCap,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { PageHeader } from "@/components/admin/dashboard/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Json, TablesInsert } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";

type AiProvider = "lovable" | "openai";

type Settings = {
  id: number;
  provider: AiProvider;
  lovable_model: string;
  openai_model: string;
  fallback_enabled: boolean;
  max_input_chars: number;
  max_output_tokens: number;
  timeout_ms: number;
  updated_at: string;
};

type Run = {
  id: string;
  provider_requested: AiProvider;
  provider_used: AiProvider | null;
  model: string | null;
  status: "success" | "error" | "limited";
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  estimated_cost_usd: number | string | null;
  duration_ms: number;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
};

type CourseForm = {
  goal: string;
  currentArea: string;
  education: string;
  weeklyHours: string;
  deadline: string;
  institutionRules: string;
  courseName: string;
  providerName: string;
  courseUrl: string;
  workloadHours: string;
  price: string;
  syllabus: string;
  certificateRequirements: string;
  portfolioProject: string;
};

type AnalysisResult = {
  verdict?: string;
  confidence?: string;
  summary?: string;
  scores?: Record<string, number>;
  complementary_hours?: { status?: string; reason?: string };
  strengths?: string[];
  warnings?: string[];
  missing_information?: string[];
  recommended_actions?: string[];
  cv_example?: string;
  linkedin_example?: string;
  disclaimer?: string;
};

type Measurement = {
  runId?: string | null;
  providerRequested: AiProvider;
  providerUsed: AiProvider;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
  durationMs: number;
};

const EMPTY_FORM: CourseForm = {
  goal: "",
  currentArea: "",
  education: "",
  weeklyHours: "",
  deadline: "",
  institutionRules: "",
  courseName: "",
  providerName: "",
  courseUrl: "",
  workloadHours: "",
  price: "",
  syllabus: "",
  certificateRequirements: "",
  portfolioProject: "",
};

const GOAL_OPTIONS = [
  {
    id: "hours",
    title: "Conseguir horas complementares",
    description: "Entender se o curso pode servir para sua faculdade.",
    value: "Conseguir horas complementares para minha graduação.",
    icon: GraduationCap,
  },
  {
    id: "resume",
    title: "Fortalecer meu currículo",
    description: "Aprender algo útil para apresentar profissionalmente.",
    value: "Melhorar meu currículo e mostrar uma habilidade profissional.",
    icon: FileCheck2,
  },
  {
    id: "job",
    title: "Conseguir uma oportunidade",
    description: "Preparar-me melhor para uma vaga ou primeiro emprego.",
    value: "Conseguir uma oportunidade de trabalho na área que quero seguir.",
    icon: BriefcaseBusiness,
  },
  {
    id: "career",
    title: "Mudar de área",
    description: "Descobrir se o curso ajuda em uma transição de carreira.",
    value: "Mudar de área profissional e começar a desenvolver as habilidades necessárias.",
    icon: ArrowRight,
  },
  {
    id: "practice",
    title: "Criar algo para mostrar",
    description: "Transformar o aprendizado em um trabalho prático.",
    value: "Criar um trabalho prático para mostrar o que sei fazer.",
    icon: BookOpenCheck,
  },
];

const WEEKLY_TIME_OPTIONS = ["Até 2 horas", "3 a 5 horas", "6 a 10 horas", "Mais de 10 horas"];

const DEADLINE_OPTIONS = ["Até 1 mês", "2 a 3 meses", "4 a 6 meses", "Mais de 6 meses", "Sem prazo definido"];

const EDUCATION_OPTIONS = [
  "Ensino fundamental incompleto",
  "Ensino fundamental completo",
  "Ensino médio incompleto",
  "Ensino médio completo",
  "Curso técnico em andamento",
  "Curso técnico completo",
  "Ensino superior em andamento",
  "Ensino superior completo",
  "Pós-graduação em andamento",
  "Pós-graduação completa",
];

const MOCK_SCENARIOS: Array<{
  id: string;
  title: string;
  description: string;
  data: CourseForm;
}> = [
  {
    id: "horas-complementares",
    title: "Horas complementares",
    description: "Curso consistente, mas sujeito às regras da faculdade.",
    data: {
      goal: "Conseguir horas complementares para concluir a graduação em Administração.",
      currentArea: "Administração",
      education: "Ensino superior incompleto — 6º semestre",
      weeklyHours: "4 horas por semana",
      deadline: "2 a 3 meses",
      institutionRules: "A faculdade aceita cursos livres relacionados à área de formação, com certificado contendo nome do aluno, carga horária, conteúdo programático e identificação da instituição. O limite por certificado é de 40 horas.",
      courseName: "Excel Aplicado à Administração",
      providerName: "Instituto Aprender — cenário fictício",
      courseUrl: "https://exemplo.com/curso-excel-administracao",
      workloadHours: "40 horas",
      price: "Gratuito",
      syllabus: "Fundamentos do Excel; fórmulas e funções; organização de bases de dados; tabelas dinâmicas; gráficos; controle de estoque; fluxo de caixa; criação de dashboard administrativo; exercício final aplicado.",
      certificateRequirements: "Concluir todas as aulas, obter pelo menos 70% na avaliação e emitir certificado digital com validação por código.",
      portfolioProject: "Dashboard de fluxo de caixa e controle de despesas de uma empresa fictícia.",
    },
  },
  {
    id: "primeiro-emprego",
    title: "Primeiro emprego",
    description: "Formação curta para fortalecer currículo e entrevista.",
    data: {
      goal: "Conseguir o primeiro emprego como assistente administrativo e apresentar uma habilidade prática no currículo.",
      currentArea: "Buscando o primeiro emprego",
      education: "Ensino médio completo",
      weeklyHours: "6 horas por semana",
      deadline: "Até 1 mês",
      institutionRules: "",
      courseName: "Rotinas Administrativas e Atendimento",
      providerName: "Escola Profissional Exemplo — cenário fictício",
      courseUrl: "https://exemplo.com/rotinas-administrativas",
      workloadHours: "24 horas",
      price: "R$ 29,90",
      syllabus: "Organização de documentos; atendimento ao cliente; comunicação profissional; elaboração de e-mails; agenda e reuniões; noções de planilhas; contas a pagar e receber; atividade prática de rotina de escritório.",
      certificateRequirements: "Assistir a 80% das aulas e concluir a atividade final. Certificado digital incluso.",
      portfolioProject: "Montar um kit com planilha de controle, modelo de e-mail profissional e organização semanal de tarefas.",
    },
  },
  {
    id: "transicao-carreira",
    title: "Transição de carreira",
    description: "Curso mais longo para migrar para análise de dados.",
    data: {
      goal: "Migrar da área administrativa para uma vaga inicial em análise de dados nos próximos seis meses.",
      currentArea: "Assistente administrativo",
      education: "Ensino superior completo em Administração",
      weeklyHours: "8 horas por semana",
      deadline: "4 a 6 meses",
      institutionRules: "",
      courseName: "Fundamentos de Análise de Dados com Python",
      providerName: "Academia Dados Abertos — cenário fictício",
      courseUrl: "https://exemplo.com/python-dados",
      workloadHours: "60 horas",
      price: "R$ 149,00",
      syllabus: "Lógica de programação; fundamentos de Python; listas e funções; leitura de arquivos CSV; tratamento de dados com pandas; análise exploratória; visualização de dados; introdução a SQL; projeto final com base pública.",
      certificateRequirements: "Concluir os módulos, exercícios e projeto final com nota mínima de 70%. Certificado verificável digitalmente.",
      portfolioProject: "Analisar uma base pública, documentar perguntas, limpeza, gráficos, conclusões e publicar o projeto em um repositório.",
    },
  },
  {
    id: "portfolio-freelancer",
    title: "Portfólio freelancer",
    description: "Curso útil somente se produzir evidências práticas.",
    data: {
      goal: "Criar um portfólio para começar a oferecer serviços de social media como freelancer.",
      currentArea: "Estudante e criador de conteúdo iniciante",
      education: "Ensino superior incompleto",
      weeklyHours: "5 horas por semana",
      deadline: "2 a 3 meses",
      institutionRules: "",
      courseName: "Planejamento de Conteúdo para Redes Sociais",
      providerName: "Estúdio Criativo Exemplo — cenário fictício",
      courseUrl: "https://exemplo.com/planejamento-conteudo",
      workloadHours: "18 horas",
      price: "R$ 59,90",
      syllabus: "Definição de público; objetivos de comunicação; pilares editoriais; calendário de conteúdo; formatos; briefing; métricas básicas; apresentação de planejamento; estudo de caso final.",
      certificateRequirements: "Conclusão das aulas. O certificado informa apenas nome, curso e carga horária.",
      portfolioProject: "Criar calendário de 30 dias, três peças demonstrativas e apresentação estratégica para uma marca fictícia.",
    },
  },
  {
    id: "curso-duvidoso",
    title: "Curso duvidoso",
    description: "Promessas exageradas e poucas evidências de qualidade.",
    data: {
      goal: "Aprender inteligência artificial para conseguir rapidamente uma fonte de renda pela internet.",
      currentArea: "Sem experiência profissional na área digital",
      education: "Ensino médio completo",
      weeklyHours: "2 horas por semana",
      deadline: "Até 1 mês",
      institutionRules: "",
      courseName: "Renda Automática com IA em 7 Dias",
      providerName: "Método Futuro Milionário — cenário fictício",
      courseUrl: "https://exemplo.com/renda-automatica-ia",
      workloadHours: "2 horas",
      price: "R$ 297,00",
      syllabus: "Introdução à inteligência artificial; lista de ferramentas populares; criação rápida de conteúdos; automação de tarefas; aula bônus sobre vendas.",
      certificateRequirements: "A página menciona certificado, mas não informa critérios, carga horária no documento ou forma de validação.",
      portfolioProject: "Não há projeto prático descrito. A oferta promete resultados financeiros, mas não apresenta atividades avaliadas.",
    },
  },
];

const SCORE_LABELS: Record<string, { title: string; description: string }> = {
  objective_fit: {
    title: "Ajuda no seu objetivo",
    description: "Quanto o curso combina com o que você quer alcançar.",
  },
  curriculum_value: {
    title: "Valor para o currículo",
    description: "Se o curso pode fortalecer sua apresentação profissional.",
  },
  portfolio_value: {
    title: "Ajuda a criar trabalhos práticos",
    description: "Se você poderá produzir algo para mostrar o que sabe fazer.",
  },
  time_feasibility: {
    title: "Cabe na sua rotina",
    description: "Considera a duração, o prazo e seu tempo disponível.",
  },
};

const verdictLabel: Record<string, string> = {
  recomendado: "Recomendado",
  recomendado_com_ressalvas: "Recomendado com ressalvas",
  nao_recomendado: "Não recomendado",
  dados_insuficientes: "Dados insuficientes",
};

const enumLabels: Record<string, string> = {
  compativel: "Compatível",
  requer_confirmacao: "Requer confirmação",
  nao_se_aplica: "Não se aplica",
  dados_insuficientes: "Dados insuficientes",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

function normalizeEnum(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function humanizeEnum(value: string | undefined) {
  const normalized = normalizeEnum(value);
  if (!normalized) return "—";
  return enumLabels[normalized] ?? verdictLabel[normalized] ?? normalized
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function scoreLevel(value: number) {
  if (value <= 20) return "Muito baixa";
  if (value <= 40) return "Baixa";
  if (value <= 60) return "Média";
  if (value <= 80) return "Alta";
  return "Muito alta";
}

function statusBadge(status: Run["status"]) {
  if (status === "success") return <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15">Sucesso</Badge>;
  if (status === "limited") return <Badge variant="secondary">Limite</Badge>;
  return <Badge variant="destructive">Erro</Badge>;
}

function formatUsd(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD", minimumFractionDigits: 4 }).format(Number(value));
}

function formatBrlEstimate(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 3 }).format(Number(value) * 6);
}

export default function CertificateCourseAiLabClient() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [models, setModels] = useState<Record<AiProvider, string[]>>({ lovable: [], openai: [] });
  const [secrets, setSecrets] = useState<Record<AiProvider, boolean>>({ lovable: false, openai: false });
  const [form, setForm] = useState<CourseForm>(EMPTY_FORM);
  const [runs, setRuns] = useState<Run[]>([]);
  const [summary, setSummary] = useState({ total: 0, success: 0, limited: 0, tokens: 0, costUsd: 0 });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [checking, setChecking] = useState<AiProvider | null>(null);
  const [savingAnalysis, setSavingAnalysis] = useState(false);
  const [savedAnalysisId, setSavedAnalysisId] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("experience");
  const [wizardStep, setWizardStep] = useState(1);
  const [customGoalEnabled, setCustomGoalEnabled] = useState(false);

  const callFunction = async <T,>(body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke<T>("certificate-course-ai", { body });
    if (error) {
      const response = (error as { context?: Response }).context;
      if (response) {
        const payload = await response.clone().json().catch(() => null) as { error?: string } | null;
        if (payload?.error) throw new Error(payload.error);
      }
      throw error;
    }
    return data as T;
  };

  const loadRuns = async () => {
    const data = await callFunction<{ runs: Run[]; summary: typeof summary }>({ action: "listRuns", limit: 30 });
    setRuns(data.runs ?? []);
    setSummary(data.summary ?? { total: 0, success: 0, limited: 0, tokens: 0, costUsd: 0 });
  };

  const load = async () => {
    setLoading(true);
    try {
      const [configData] = await Promise.all([
        callFunction<{
          settings: Settings;
          availableModels: Record<AiProvider, string[]>;
          secrets: Record<AiProvider, boolean>;
        }>({ action: "getConfig" }),
        loadRuns(),
      ]);
      setSettings(configData.settings);
      setModels(configData.availableModels);
      setSecrets(configData.secrets);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar o laboratório.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentModel = useMemo(() => {
    if (!settings) return "";
    return settings.provider === "lovable" ? settings.lovable_model : settings.openai_model;
  }, [settings]);

  const updateForm = (field: keyof CourseForm, value: string) => {
    setSelectedScenario(null);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const applyMockScenario = (scenario: (typeof MOCK_SCENARIOS)[number]) => {
    setSelectedScenario(scenario.id);
    setForm({ ...scenario.data });
    setCustomGoalEnabled(true);
    setResult(null);
    setMeasurement(null);
    setWizardStep(1);
    setActiveTab("experience");
    toast.success(`Cenário “${scenario.title}” carregado sem consumir API.`);
  };

  const updateSettings = <K extends keyof Settings>(field: K, value: Settings[K]) => {
    setSettings((current) => current ? { ...current, [field]: value } : current);
  };

  const handleModelChange = (value: string) => {
    if (!settings) return;
    if (settings.provider === "lovable") updateSettings("lovable_model", value);
    else updateSettings("openai_model", value);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const data = await callFunction<{ settings: Settings }>({ action: "saveConfig", settings });
      setSettings(data.settings);
      toast.success("Configuração de IA salva.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleHealthcheck = async (provider: AiProvider) => {
    setChecking(provider);
    try {
      const data = await callFunction<{ ok: boolean; attempt: { model: string; duration_ms: number } }>({ action: "healthcheck", provider });
      toast.success(`${provider === "lovable" ? "Lovable" : "OpenAI"} respondeu em ${data.attempt.duration_ms} ms (${data.attempt.model}).`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha no teste de conexão.");
    } finally {
      setChecking(null);
    }
  };

  const canAnalyze = form.goal.trim() && form.courseName.trim() && form.syllabus.trim();

  const handleAnalyze = async () => {
    if (!canAnalyze || !settings) return;
    setAnalyzing(true);
    setResult(null);
    setMeasurement(null);
    setSavedAnalysisId(null);
    try {
      const saved = await callFunction<{ settings: Settings }>({ action: "saveConfig", settings });
      setSettings(saved.settings);
      const data = await callFunction<{ result: AnalysisResult; measurement: Measurement }>({ action: "analyze", input: form });
      setResult(data.result);
      setMeasurement(data.measurement);
      setWizardStep(4);
      await loadRuns();
      toast.success("Análise concluída e custo registrado.");
    } catch (error) {
      await loadRuns().catch(() => undefined);
      toast.error(error instanceof Error ? error.message : "Falha ao executar análise.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveAnalysis = async () => {
    if (!user || !result) {
      toast.error("Faça login para salvar a análise.");
      return;
    }

    const analysisId = savedAnalysisId ?? measurement?.runId ?? crypto.randomUUID();
    setSavingAnalysis(true);
    try {
      const metadata = {
        title: form.courseName || "Análise de curso",
        description: result.summary ?? "",
        course_name: form.courseName,
        provider_name: form.providerName,
        verdict: result.verdict,
        confidence: result.confidence,
        form,
        result,
        measurement,
        saved_from: "certificate_course_ai",
      };

      const insertData: TablesInsert<"saved_items"> = {
        user_id: user.id,
        item_type: "course_analysis",
        item_id: analysisId,
        metadata: metadata as Json,
      };

      const { data: existing, error: existingError } = await supabase
        .from("saved_items")
        .select("id")
        .eq("user_id", user.id)
        .eq("item_type", "course_analysis")
        .eq("item_id", analysisId)
        .maybeSingle();

      if (existingError) throw existingError;

      const { error } = existing
        ? await supabase
            .from("saved_items")
            .update({ metadata: metadata as Json })
            .eq("id", existing.id)
        : await supabase
            .from("saved_items")
            .insert(insertData);

      if (error) throw error;

      setSavedAnalysisId(analysisId);
      toast.success("Análise salva em Salvos.");
    } catch (error) {
      console.error("Failed to save course analysis", error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error && "message" in error
            ? String((error as { message?: unknown }).message)
            : "Não foi possível salvar a análise.";

      toast.error(message || "Não foi possível salvar a análise.");
    } finally {
      setSavingAnalysis(false);
    }
  };

  const resetExperience = () => {
    setForm(EMPTY_FORM);
    setCustomGoalEnabled(false);
    setSelectedScenario(null);
    setResult(null);
    setMeasurement(null);
    setSavedAnalysisId(null);
    setWizardStep(1);
  };

  const selectGoal = (goal: string) => {
    setCustomGoalEnabled(false);
    updateForm("goal", goal);
  };

  const toggleCustomGoal = (checked: boolean) => {
    setCustomGoalEnabled(checked);
    setSelectedScenario(null);
    setForm((current) => ({ ...current, goal: "" }));
  };

  const goalNeedsInstitutionRules = /hora|faculdade|universidade|graduação/i.test(form.goal);

  if (loading || !settings) {
    return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Certificado que Conta"
        description="Desenvolva e acompanhe a experiência do produto antes de liberá-lo aos clientes."
        actions={<Button variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Atualizar</Button>}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid h-auto w-full max-w-xl grid-cols-2 rounded-xl bg-muted/70 p-1">
          <TabsTrigger value="experience" className="gap-2 rounded-lg py-2.5"><Sparkles className="h-4 w-4" />Experiência do usuário</TabsTrigger>
          <TabsTrigger value="admin" className="gap-2 rounded-lg py-2.5"><Settings2 className="h-4 w-4" />Administração e custos</TabsTrigger>
        </TabsList>

        <TabsContent value="experience" className="mt-0">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[1.5rem] border border-primary/20 bg-card shadow-[0_24px_80px_hsl(var(--primary)/0.08)]">
            <div className="border-b border-primary/15 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-5 py-7 sm:px-8 lg:px-12 lg:py-10">
              <Badge className="mb-4 bg-primary/15 text-primary hover:bg-primary/15">Prévia do cliente</Badge>
              <h2 className="max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">Esse curso realmente vale a pena para você?</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">Conte o que você busca e veja como o curso pode ajudar no seu objetivo, currículo e rotina.</p>
            </div>

            <div className="px-5 py-6 sm:px-8 lg:px-12 lg:py-10">
              <div className="mb-10 grid grid-cols-4 gap-2 sm:gap-4">
                {[
                  { step: 1, label: "Objetivo", icon: Target },
                  { step: 2, label: "Sobre você", icon: UserRound },
                  { step: 3, label: "O curso", icon: BookOpenCheck },
                  { step: 4, label: "Resultado", icon: CheckCircle2 },
                ].map((item) => {
                  const complete = wizardStep > item.step;
                  const active = wizardStep === item.step;
                  const Icon = item.icon;
                  return (
                    <div key={item.step} className="relative flex flex-col items-center text-center">
                      <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${active ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20" : complete ? "border-primary/40 bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground"}`}>
                        {complete ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </div>
                      <span className={`mt-2 text-[11px] font-medium sm:text-xs ${active || complete ? "text-foreground" : "text-muted-foreground"}`}>{item.label}</span>
                      {item.step < 4 && <span className={`absolute left-[calc(50%+1.25rem)] right-[calc(-50%+1.25rem)] top-5 h-px ${wizardStep > item.step ? "bg-primary/50" : "bg-border"}`} />}
                    </div>
                  );
                })}
              </div>

              {wizardStep === 1 && (
                <div className="mx-auto max-w-4xl space-y-7">
                  <div className="text-center"><h3 className="text-xl font-bold sm:text-2xl">O que você quer alcançar?</h3><p className="mt-2 text-sm text-muted-foreground">Escolha a opção que mais combina com você.</p></div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {GOAL_OPTIONS.map((option) => {
                      const selected = form.goal === option.value;
                      const Icon = option.icon;
                      return (
                        <button key={option.id} type="button" onClick={() => selectGoal(option.value)} className={`group rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg ${selected ? "border-primary bg-primary/10 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.2)]" : "bg-background/60"}`}>
                          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${selected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}><Icon className="h-5 w-5" /></span>
                          <span className="mt-4 block font-semibold">{option.title}</span>
                          <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">{option.description}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="rounded-2xl border bg-background/40 p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox id="custom-goal" checked={customGoalEnabled} onCheckedChange={(checked) => toggleCustomGoal(checked === true)} className="mt-0.5" />
                      <div className="space-y-1">
                        <Label htmlFor="custom-goal" className="cursor-pointer">Quero descrever outro objetivo</Label>
                        <p className="text-sm text-muted-foreground">Ative somente se nenhuma das opções acima representar o que você busca.</p>
                      </div>
                    </div>
                    {customGoalEnabled && (
                      <div className="mt-4 space-y-2 border-t pt-4">
                        <Label htmlFor="custom-goal-description">Qual é o seu objetivo?</Label>
                        <Textarea id="custom-goal-description" rows={2} autoFocus placeholder="Ex.: quero entender se este curso pode me ajudar a conseguir uma promoção." value={form.goal} onChange={(event) => updateForm("goal", event.target.value)} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="mx-auto max-w-3xl space-y-7">
                  <div className="text-center"><h3 className="text-xl font-bold sm:text-2xl">Conte um pouco sobre você</h3><p className="mt-2 text-sm text-muted-foreground">Usaremos apenas o necessário para deixar a análise mais útil.</p></div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2"><Label>Qual é sua área atual?</Label><Input placeholder="Ex.: Administração, estudante, ainda não trabalho" value={form.currentArea} onChange={(event) => updateForm("currentArea", event.target.value)} /></div>
                    <div className="space-y-2">
                      <Label>Até onde você estudou?</Label>
                      <Select value={form.education} onValueChange={(value) => updateForm("education", value)}>
                        <SelectTrigger><SelectValue placeholder="Selecione sua escolaridade" /></SelectTrigger>
                        <SelectContent>
                          {form.education && !EDUCATION_OPTIONS.includes(form.education) && <SelectItem value={form.education}>{form.education}</SelectItem>}
                          {EDUCATION_OPTIONS.map((education) => <SelectItem key={education} value={education}>{education}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-3"><Label>Quanto tempo você tem por semana? *</Label><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{WEEKLY_TIME_OPTIONS.map((time) => <button key={time} type="button" onClick={() => updateForm("weeklyHours", time)} className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${form.weeklyHours === time ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/40"}`}>{time}</button>)}</div></div>
                  <div className="space-y-3">
                    <Label>Quando você gostaria de terminar?</Label>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {DEADLINE_OPTIONS.map((deadline) => (
                        <button key={deadline} type="button" onClick={() => updateForm("deadline", deadline)} className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${form.deadline === deadline ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/40"}`}>
                          {deadline}
                        </button>
                      ))}
                    </div>
                  </div>
                  {goalNeedsInstitutionRules && <div className="space-y-2 rounded-2xl border border-primary/20 bg-primary/5 p-4"><Label>Você conhece as regras da sua faculdade?</Label><Textarea rows={3} placeholder="Cole as regras aqui. Se não souber, pode deixar em branco." value={form.institutionRules} onChange={(event) => updateForm("institutionRules", event.target.value)} /></div>}
                </div>
              )}

              {wizardStep === 3 && (
                <div className="mx-auto max-w-4xl space-y-7">
                  <div className="text-center"><h3 className="text-xl font-bold sm:text-2xl">Agora, conte sobre o curso</h3><p className="mt-2 text-sm text-muted-foreground">Você encontra a maioria dessas informações na página do curso.</p></div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2"><Label>Nome do curso *</Label><Input placeholder="Digite o nome completo" value={form.courseName} onChange={(event) => updateForm("courseName", event.target.value)} /></div>
                    <div className="space-y-2"><Label>Quem oferece o curso?</Label><Input placeholder="Plataforma, escola ou instituição" value={form.providerName} onChange={(event) => updateForm("providerName", event.target.value)} /></div>
                    <div className="space-y-2"><Label>Duração total</Label><Input placeholder="Ex.: 40 horas" value={form.workloadHours} onChange={(event) => updateForm("workloadHours", event.target.value)} /></div>
                    <div className="space-y-2"><Label>Preço</Label><Input placeholder="Ex.: gratuito ou R$ 49,90" value={form.price} onChange={(event) => updateForm("price", event.target.value)} /></div>
                    <div className="space-y-2 sm:col-span-2"><Label>O que o curso ensina? *</Label><Textarea rows={6} placeholder="Cole os módulos, aulas ou assuntos apresentados pelo curso." value={form.syllabus} onChange={(event) => updateForm("syllabus", event.target.value)} /></div>
                  </div>
                  <details className="group rounded-2xl border bg-muted/20 p-4">
                    <summary className="cursor-pointer list-none font-semibold">Adicionar mais informações <span className="ml-1 text-xs font-normal text-muted-foreground">(opcional, mas melhora a análise)</span></summary>
                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2"><Label>Link do curso</Label><Input type="url" placeholder="https://..." value={form.courseUrl} onChange={(event) => updateForm("courseUrl", event.target.value)} /></div>
                      <div className="space-y-2"><Label>O que é necessário para receber o certificado?</Label><Textarea rows={3} placeholder="Ex.: assistir às aulas ou fazer uma prova." value={form.certificateRequirements} onChange={(event) => updateForm("certificateRequirements", event.target.value)} /></div>
                      <div className="space-y-2"><Label>O curso propõe algum trabalho prático?</Label><Textarea rows={3} placeholder="Conte o que você produzirá durante o curso." value={form.portfolioProject} onChange={(event) => updateForm("portfolioProject", event.target.value)} /></div>
                    </div>
                  </details>
                </div>
              )}

              {wizardStep === 4 && result && (
                <CustomerResult
                  result={result}
                  form={form}
                  onReset={resetExperience}
                  onSaveAnalysis={handleSaveAnalysis}
                  savingAnalysis={savingAnalysis}
                  analysisSaved={Boolean(savedAnalysisId)}
                />
              )}

              {wizardStep < 4 && (
                <div className="mx-auto mt-10 flex max-w-4xl items-center justify-between border-t pt-6">
                  <Button variant="ghost" disabled={wizardStep === 1} onClick={() => setWizardStep((step) => Math.max(1, step - 1))}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
                  {wizardStep < 3 ? (
                    <Button size="lg" disabled={(wizardStep === 1 && !form.goal.trim()) || (wizardStep === 2 && !form.weeklyHours)} onClick={() => setWizardStep((step) => Math.min(3, step + 1))}>Continuar<ArrowRight className="ml-2 h-4 w-4" /></Button>
                  ) : (
                    <Button size="lg" disabled={!canAnalyze || analyzing} onClick={() => void handleAnalyze()}>{analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Ver minha análise</Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="admin" className="mt-0 space-y-6">
          <Alert><ShieldCheck className="h-4 w-4" /><AlertDescription>Área exclusiva para administradores. Configurações, testes e custos nunca aparecem para o cliente.</AlertDescription></Alert>

          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Testes registrados</p><p className="mt-1 text-2xl font-bold">{summary.total}</p></CardContent></Card>
            <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Sucessos</p><p className="mt-1 text-2xl font-bold text-emerald-600">{summary.success}</p></CardContent></Card>
            <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Tokens medidos</p><p className="mt-1 text-2xl font-bold">{summary.tokens.toLocaleString("pt-BR")}</p></CardContent></Card>
            <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Custo estimado</p><p className="mt-1 text-2xl font-bold">{formatBrlEstimate(summary.costUsd)}</p><p className="text-[11px] text-muted-foreground">Câmbio de referência: R$ 6/US$</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Play className="h-5 w-5" />Cenários de teste</CardTitle><CardDescription>Carregue dados prontos e abra a experiência do usuário sem consumir API.</CardDescription></CardHeader>
            <CardContent><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{MOCK_SCENARIOS.map((scenario, index) => <button key={scenario.id} type="button" onClick={() => applyMockScenario(scenario)} className={`rounded-xl border p-4 text-left transition-all hover:border-primary/50 hover:bg-primary/5 ${selectedScenario === scenario.id ? "border-primary bg-primary/10" : ""}`}><span className="text-xs text-muted-foreground">Cenário {index + 1}</span><span className="mt-1 block font-semibold">{scenario.title}</span><span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">{scenario.description}</span><span className="mt-3 inline-flex items-center text-xs font-medium text-primary">Carregar cenário<ArrowRight className="ml-1 h-3 w-3" /></span></button>)}</div></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bot className="h-5 w-5" />Provedor e limites</CardTitle><CardDescription>Escolha a IA usada nas análises e controle o consumo.</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">{(["lovable", "openai"] as AiProvider[]).map((provider) => <div key={provider} className="flex items-center justify-between rounded-xl border p-4"><div><p className="font-medium">{provider === "lovable" ? "Lovable / Gemini" : "OpenAI"}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">{secrets[provider] ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}{secrets[provider] ? "Secret configurado" : "Secret ausente"}</p></div><Button size="sm" variant="outline" disabled={!secrets[provider] || checking !== null} onClick={() => void handleHealthcheck(provider)}>{checking === provider ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wifi className="mr-2 h-4 w-4" />}Testar</Button></div>)}</div>
              <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Provedor principal</Label><Select value={settings.provider} onValueChange={(value) => updateSettings("provider", value as AiProvider)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="lovable">Lovable / Gemini</SelectItem><SelectItem value="openai">OpenAI</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Modelo ativo</Label><Select value={currentModel} onValueChange={handleModelChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{models[settings.provider].map((model) => <SelectItem key={model} value={model}>{model}</SelectItem>)}</SelectContent></Select></div></div>
              <div className="flex items-center justify-between rounded-xl border p-4"><div><Label htmlFor="fallback">Fallback automático</Label><p className="text-xs text-muted-foreground">Usa o outro provedor somente quando o principal estiver sem saldo ou limitado.</p></div><Switch id="fallback" checked={settings.fallback_enabled} onCheckedChange={(value) => updateSettings("fallback_enabled", value)} /></div>
              <div className="grid gap-4 md:grid-cols-3"><div className="space-y-2"><Label>Máx. caracteres de entrada</Label><Input type="number" min={2000} max={30000} value={settings.max_input_chars} onChange={(event) => updateSettings("max_input_chars", Number(event.target.value))} /></div><div className="space-y-2"><Label>Máx. tokens de saída</Label><Input type="number" min={300} max={4000} value={settings.max_output_tokens} onChange={(event) => updateSettings("max_output_tokens", Number(event.target.value))} /></div><div className="space-y-2"><Label>Timeout em milissegundos</Label><Input type="number" min={5000} max={120000} step={1000} value={settings.timeout_ms} onChange={(event) => updateSettings("timeout_ms", Number(event.target.value))} /></div></div>
              <div className="flex justify-end"><Button onClick={() => void handleSave()} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar configuração</Button></div>
            </CardContent>
          </Card>

          {measurement && <Card className="border-primary/25"><CardHeader><CardTitle className="text-base">Última análise</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-4"><AdminMetric label="Provedor" value={`${measurement.providerUsed} · ${measurement.model}`} /><AdminMetric label="Tokens" value={measurement.totalTokens?.toLocaleString("pt-BR") ?? "—"} /><AdminMetric label="Duração" value={`${(measurement.durationMs / 1000).toFixed(1)}s`} /><AdminMetric label="Custo estimado" value={`${formatBrlEstimate(measurement.estimatedCostUsd)} · ${formatUsd(measurement.estimatedCostUsd)}`} /></CardContent></Card>}

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Coins className="h-5 w-5" />Histórico de consumo</CardTitle><CardDescription>Últimas 30 análises. Os valores em reais usam câmbio de referência.</CardDescription></CardHeader>
            <CardContent>{runs.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum teste registrado.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="px-3 py-3">Data</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Provedor</th><th className="px-3 py-3">Modelo</th><th className="px-3 py-3">Tokens</th><th className="px-3 py-3">Duração</th><th className="px-3 py-3">Custo</th></tr></thead><tbody>{runs.map((run) => <tr key={run.id} className="border-b last:border-0"><td className="px-3 py-3 text-muted-foreground">{new Date(run.created_at).toLocaleString("pt-BR")}</td><td className="px-3 py-3">{statusBadge(run.status)}</td><td className="px-3 py-3">{run.provider_used ?? run.provider_requested}</td><td className="px-3 py-3 font-mono text-xs">{run.model ?? "—"}</td><td className="px-3 py-3">{run.total_tokens?.toLocaleString("pt-BR") ?? "—"}</td><td className="px-3 py-3"><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{(run.duration_ms / 1000).toFixed(1)}s</span></td><td className="px-3 py-3">{formatBrlEstimate(run.estimated_cost_usd)}</td></tr>)}</tbody></table></div>}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AdminMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-semibold">{value}</p></div>;
}

function parseHours(value: string) {
  const match = value.replace(",", ".").match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const hours = Number(match[0]);
  return Number.isFinite(hours) && hours > 0 ? hours : null;
}

function weeklyHoursEstimate(value: string) {
  if (value === "Até 2 horas") return 2;
  if (value === "3 a 5 horas") return 4;
  if (value === "6 a 10 horas") return 8;
  if (value === "Mais de 10 horas") return 12;
  return null;
}

function deadlineWeeks(value: string) {
  if (value === "Até 1 mês") return 4;
  if (value === "2 a 3 meses") return 12;
  if (value === "4 a 6 meses") return 26;
  return null;
}

function formatStudyTime(weeks: number) {
  if (weeks <= 4) return `${weeks} ${weeks === 1 ? "semana" : "semanas"}`;
  const months = Math.ceil(weeks / 4.33);
  if (months < 12) return `Cerca de ${months} meses`;
  const years = (months / 12).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `Cerca de ${years} ${months <= 12 ? "ano" : "anos"}`;
}

function CustomerResult({
  result,
  form,
  onReset,
  onSaveAnalysis,
  savingAnalysis,
  analysisSaved,
}: {
  result: AnalysisResult;
  form: CourseForm;
  onReset: () => void;
  onSaveAnalysis: () => void;
  savingAnalysis: boolean;
  analysisSaved: boolean;
}) {
  const verdict = normalizeEnum(result.verdict);
  const positive = verdict === "recomendado";
  const negative = verdict === "nao_recomendado";
  const verdictStyles = positive
    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : negative
      ? "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300"
      : "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  const radarData = [
    { key: "objective_fit", label: "Objetivo" },
    { key: "curriculum_value", label: "Currículo" },
    { key: "portfolio_value", label: "Prática" },
    { key: "time_feasibility", label: "Rotina" },
  ].map((item) => ({
    ...item,
    fullLabel: SCORE_LABELS[item.key].title,
    value: Math.max(0, Math.min(100, Number(result.scores?.[item.key] ?? 0))),
  }));
  const courseHours = parseHours(form.workloadHours);
  const weeklyHours = weeklyHoursEstimate(form.weeklyHours);
  const estimatedWeeks = courseHours && weeklyHours ? Math.ceil(courseHours / weeklyHours) : null;
  const desiredWeeks = deadlineWeeks(form.deadline);
  const hoursAvailable = desiredWeeks && weeklyHours ? desiredWeeks * weeklyHours : null;
  const deadlineCoverage = courseHours && hoursAvailable ? Math.min(100, Math.round((hoursAvailable / courseHours) * 100)) : null;
  const missingHours = courseHours && hoursAvailable ? Math.max(0, courseHours - hoursAvailable) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <div className={`rounded-2xl border p-6 text-center sm:p-8 ${verdictStyles}`}>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-current/10">
          {positive ? <CheckCircle2 className="h-6 w-6" /> : negative ? <AlertTriangle className="h-6 w-6" /> : <Target className="h-6 w-6" />}
        </span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] opacity-75">Nossa análise</p>
        <h3 className="mt-2 text-2xl font-bold sm:text-3xl">{humanizeEnum(result.verdict)}</h3>
        {result.confidence && <p className="mt-2 text-xs opacity-75">Confiança da análise: {humanizeEnum(result.confidence)}</p>}
      </div>

      <div className="rounded-2xl border bg-background/60 p-5 sm:p-6">
        <h4 className="font-semibold">O que encontramos</h4>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">{result.summary}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-background/60 p-5 sm:p-6">
          <div>
            <h4 className="font-semibold">Mapa de compatibilidade</h4>
            <p className="mt-1 text-sm text-muted-foreground">Veja rapidamente onde o curso combina mais ou menos com você.</p>
          </div>
          <div className="mt-3 h-[300px] w-full" role="img" aria-label="Gráfico com a compatibilidade do curso para objetivo, currículo, prática e rotina">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [`${Number(value)}/100`, "Compatibilidade"]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel ?? ""}
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--popover-foreground))" }}
                />
                <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border bg-background/60 p-5 sm:p-6">
          <h4 className="font-semibold">Tempo estimado para concluir</h4>
          <p className="mt-1 text-sm text-muted-foreground">Uma estimativa simples usando a duração do curso e sua disponibilidade.</p>
          {estimatedWeeks ? (
            <div className="mt-5 space-y-4">
              <div>
                  <p className="whitespace-nowrap text-[clamp(1.45rem,3vw,1.7rem)] font-bold leading-tight text-primary">{formatStudyTime(estimatedWeeks)}</p>
                <p className="mt-2 text-sm text-muted-foreground">{courseHours}h de curso · cerca de {weeklyHours}h por semana</p>
              </div>
              {deadlineCoverage !== null && (
                <TimeCoverageClock coverage={deadlineCoverage} />
              )}
              {deadlineCoverage !== null && (
                <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium">Dentro do prazo escolhido</span>
                    <span className="font-semibold text-primary">{hoursAvailable}h de {courseHours}h</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {missingHours && missingHours > 0
                      ? `Faltariam cerca de ${missingHours}h para concluir no prazo escolhido.`
                      : "Sua disponibilidade cobre o curso inteiro nesse período."}
                  </p>
                </div>
              )}
              {deadlineCoverage === null && (
                <p className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">Como você não definiu um prazo exato, mostramos apenas o tempo aproximado de conclusão.</p>
              )}
            </div>
          ) : (
            <div className="mt-8 rounded-xl border border-dashed p-6 text-center">
              <Clock3 className="mx-auto h-7 w-7 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">Estimativa indisponível</p>
              <p className="mt-1 text-xs text-muted-foreground">A carga horária do curso não foi informada de forma numérica.</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(result.scores ?? {}).map(([key, value]) => {
          const copy = SCORE_LABELS[key] ?? { title: humanizeEnum(key), description: "" };
          return (
            <div key={key} className="flex min-h-40 flex-col rounded-2xl border bg-background/60 p-4">
              <div>
                <p className="min-h-10 font-semibold leading-tight">{copy.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{copy.description}</p>
              </div>
              <div className="mt-auto pt-4">
                <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(3, Math.min(100, value))}%` }} /></div>
                <p className="mt-2 text-sm font-semibold text-primary">{scoreLevel(value)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ResultCard title="Aspectos favoráveis" items={result.strengths} tone="positive" />
        <ResultCard title="Pontos de atenção" items={result.warnings} tone="warning" />
        <ChecklistCard title="O que falta confirmar" items={result.missing_information} />
        <ChecklistCard title="O que fazer agora" items={result.recommended_actions} />
      </div>

      {result.complementary_hours && normalizeEnum(result.complementary_hours.status) !== "nao_se_aplica" && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <p className="font-semibold">Uso como horas complementares: {humanizeEnum(result.complementary_hours.status)}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{result.complementary_hours.reason}</p>
        </div>
      )}

      {(result.cv_example || result.linkedin_example) && (
        <div className="grid gap-4 md:grid-cols-2">
          {result.cv_example && <CopyableTextCard title="Como colocar no currículo" text={result.cv_example} />}
          {result.linkedin_example && (
            <CopyableTextCard title="Como apresentar no LinkedIn" text={result.linkedin_example} icon={<LinkedInIcon className="h-5 w-5 text-[#0A66C2]" />} />
          )}
        </div>
      )}

      {result.disclaimer && normalizeEnum(result.complementary_hours?.status) !== "nao_se_aplica" && <p className="text-center text-xs italic text-muted-foreground">{result.disclaimer}</p>}

      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <Button onClick={onSaveAnalysis} disabled={savingAnalysis || analysisSaved}>
          {savingAnalysis ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {analysisSaved ? "Salvo em Salvos" : "Salvar análise"}
        </Button>
        <Button variant="outline" onClick={onReset}><RotateCcw className="mr-2 h-4 w-4" />Analisar outro curso</Button>
      </div>
    </div>
  );
}

function TimeCoverageClock({ coverage }: { coverage: number }) {
  const clamped = Math.max(0, Math.min(100, coverage));
  const isComplete = coverage >= 100;
  const isComfortable = coverage >= 70;
  const fillColor = isComplete ? "rgb(16 185 129)" : isComfortable ? "rgb(245 158 11)" : "rgb(244 63 94)";
  const status = isComplete ? "Cabe no prazo" : isComfortable ? "Quase cabe" : "Prazo apertado";
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeLength = (clamped / 100) * circumference;

  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl border bg-muted/10 p-4 sm:flex-row sm:items-center">
      <div className="relative grid h-24 w-24 shrink-0 place-items-center" role="img" aria-label={`Relógio de disponibilidade: aproximadamente ${coverage}% do curso cabe no prazo escolhido.`}>
        <svg className="absolute inset-0 h-full w-full -rotate-90 drop-shadow-[0_0_18px_hsl(var(--primary)/0.12)]" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="16" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={fillColor}
            strokeWidth="16"
            strokeDasharray={`${strokeLength} ${circumference}`}
            strokeLinecap="butt"
          />
        </svg>
        <span className="relative z-10 grid h-12 w-12 place-items-center rounded-full border bg-background/95 text-foreground shadow-sm">
          <span className="text-lg font-bold">{coverage}%</span>
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{status}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {isComplete
            ? "Sua disponibilidade cobre o curso inteiro nesse período."
            : "A parte preenchida mostra quanto do curso cabe no prazo."}
        </p>
      </div>
    </div>
  );
}

function ResultCard({ title, items, tone = "default" }: { title: string; items?: string[]; tone?: "default" | "positive" | "warning" }) {
  if (!items?.length) return null;
  const toneClass = tone === "positive"
    ? "border-emerald-500/30 bg-emerald-500/15"
    : tone === "warning"
      ? "border-rose-500/30 bg-rose-500/15"
      : "bg-background/60";
  const Icon = tone === "warning" ? AlertTriangle : CheckCircle2;
  const iconClass = tone === "warning" ? "text-rose-400" : tone === "positive" ? "text-emerald-400" : "text-primary";

  return (
    <div className={`rounded-2xl border p-5 ${toneClass}`}>
      <p className="font-semibold">{title}</p>
      <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
        {items.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2.5"><Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`} /><span className="leading-relaxed">{item}</span></li>)}
      </ul>
    </div>
  );
}

function ChecklistCard({ title, items }: { title: string; items?: string[] }) {
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setCheckedItems({});
  }, [items]);

  if (!items?.length) return null;

  const completed = items.filter((_, index) => checkedItems[index]).length;

  return (
    <div className="rounded-2xl border bg-background/60 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">Use como lista de verificação antes de decidir.</p>
        </div>
        <span className="shrink-0 rounded-full border bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {completed}/{items.length} concluídas
        </span>
      </div>

      <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
        {items.map((item, index) => {
          const checked = Boolean(checkedItems[index]);
          return (
            <li key={`${item}-${index}`} className="flex gap-3">
              <Checkbox
                checked={checked}
                onCheckedChange={(value) => setCheckedItems((current) => ({ ...current, [index]: Boolean(value) }))}
                className="mt-0.5 shrink-0"
                aria-label={`Marcar tarefa: ${item}`}
              />
              <span className={`leading-relaxed transition-all ${checked ? "text-muted-foreground/60 line-through" : ""}`}>{item}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CopyableTextCard({ title, text, icon }: { title: string; text: string; icon?: React.ReactNode }) {
  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Texto copiado.");
    } catch {
      toast.error("Não foi possível copiar o texto.");
    }
  };

  return (
    <div className="relative rounded-2xl border p-5 pr-14">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="absolute right-3 top-3 h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={() => void copyText()}
        aria-label={`Copiar texto: ${title}`}
      >
        <Copy className="h-4 w-4" />
      </Button>
      <p className="flex items-center gap-2 font-semibold">{icon}{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.58c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.68H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12Zm1.78 13.02H3.56V9h3.56v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0Z" />
    </svg>
  );
}
