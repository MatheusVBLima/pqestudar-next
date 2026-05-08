import { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  Info,
  AlertTriangle,
  Lock
} from "lucide-react";
import { useOportunidadesAdmin, Oportunidade, FonteOportunidade, type OportunidadeInput } from "@/hooks/useOportunidades";
import { Alert, AlertDescription } from "@/components/ui/alert";
import MarkdownEditor, { countMarkdownWords, markdownToHtml } from "./MarkdownEditor";
import { getErrorMessage } from "@/lib/error-message";

// Stopwords to remove from slug
const STOPWORDS = ["de", "da", "do", "das", "dos", "para", "e", "a", "o", "em", "um", "uma", "com", "por", "ao", "aos", "no", "na", "nos", "nas"];

// Generic title patterns to warn about
const GENERIC_PATTERNS = [
  /^concurso\s+\d{4}$/i,
  /^edital\s+(aberto|publicado)$/i,
  /^novo\s+concurso$/i,
  /^oportunidade\s+\d{4}$/i,
];

function generateSlug(title: string): string {
  const words = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/\s+/)
    .filter(word => word.length > 0 && !STOPWORDS.includes(word));
  
  return words.join("-").replace(/-+/g, "-").slice(0, 100);
}

// Use markdown word count for validation
function countWords(text: string): number {
  return countMarkdownWords(text);
}

function isGenericTitle(title: string): boolean {
  return GENERIC_PATTERNS.some(pattern => pattern.test(title.trim()));
}

const fonteSchema = z.object({
  source_url: z.string().url("URL inválida").regex(/^https?:\/\//, "URL deve começar com http:// ou https://"),
  source_title: z.string().optional(),
  source_tipo: z.enum(["oficial", "diario", "banca", "outro-oficial"]),
  source_date: z.string().optional(),
});

const atualizacaoSchema = z.object({
  data_atualizacao: z.string().min(1, "Data obrigatória"),
  texto: z.string().min(10, "Texto muito curto").max(400, "Máximo 400 caracteres"),
});

const formSchema = z.object({
  titulo: z.string()
    .min(30, "Título deve ter pelo menos 30 caracteres")
    .max(150, "Título muito longo"),
  slug: z.string()
    .min(3, "Slug deve ter pelo menos 3 caracteres")
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  categoria: z.enum(["Concurso", "Políticas Públicas", "Educação"]),
  tipo: z.enum(["Concurso", "Programa educacional", "Processo seletivo", "Processo Seletivo Simplificado"]),
  escolaridades: z.array(z.enum(["Fundamental", "Médio", "Superior"])).min(1, "Selecione pelo menos uma escolaridade"),
  abrangencia: z.enum(["Nacional", "Estadual", "Municipal"]),
  situacao: z.enum(["Previsto", "Edital publicado", "Aberto", "Encerrado"]),
  link_edital: z.string().url("URL inválida").optional().or(z.literal("")),
  orgao: z.string().optional(),
  banca: z.string().optional(),
  resumo_editorial: z.string().optional().or(z.literal("")),
  conteudo_markdown: z.string().optional(),
  conteudo_principal: z.string().optional(),
  meta_title: z.string().max(70, "Meta título muito longo").optional(),
  meta_description: z.string().max(160, "Meta descrição muito longa").optional(),
  data_publicacao: z.string().optional(),
  publicado: z.boolean().default(false),
  fontes: z.array(fonteSchema).min(0),
  atualizacoes: z.array(atualizacaoSchema).min(0),
}).refine(
  (data) => {
    if (data.situacao === "Aberto" || data.situacao === "Edital publicado") {
      return data.link_edital && data.link_edital.length > 0;
    }
    return true;
  },
  {
    message: "Link do edital é obrigatório quando a situação é 'Aberto' ou 'Edital publicado'",
    path: ["link_edital"],
  }
).refine(
  (data) => {
    if (data.publicado) {
      return data.fontes.some(f => 
        ["oficial", "diario", "banca", "outro-oficial"].includes(f.source_tipo)
      );
    }
    return true;
  },
  {
    message: "Para publicar, é necessário pelo menos uma fonte oficial",
    path: ["fontes"],
  }
).refine(
  (data) => {
    if (data.publicado && data.resumo_editorial) {
      return data.resumo_editorial.length >= 300;
    }
    if (data.publicado) {
      return false;
    }
    return true;
  },
  {
    message: "Resumo editorial deve ter pelo menos 300 caracteres para publicar",
    path: ["resumo_editorial"],
  }
).refine(
  (data) => {
    if (data.publicado) {
      // Use conteudo_markdown for word count
      const wordCount = countWords(data.conteudo_markdown || data.conteudo_principal || "");
      return wordCount >= 600;
    }
    return true;
  },
  {
    message: "Conteúdo principal deve ter pelo menos 600 palavras para publicar",
    path: ["conteudo_markdown"],
  }
);

type FormData = z.infer<typeof formSchema>;

interface AtualizacaoOportunidade {
  data_atualizacao?: string;
  texto?: string;
}

type OportunidadeFormItem = Oportunidade & {
  escolaridades?: FormData["escolaridades"];
  conteudo_markdown?: string | null;
  conteudo_principal?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  atualizacoes_oportunidade?: AtualizacaoOportunidade[];
};

type OportunidadePayload = OportunidadeInput & {
  escolaridades: FormData["escolaridades"];
  conteudo_markdown?: string;
  conteudo_html?: string;
  conteudo_principal?: string;
  meta_title?: string;
  meta_description?: string;
  atualizacoes: { data_atualizacao: string; texto: string }[];
};

interface OportunidadeModalProps {
  open: boolean;
  onClose: () => void;
  editingItem: Oportunidade | null;
  onSuccess: () => void;
}

// SEO hint component
function SeoHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
      <Info className="h-3 w-3 mt-0.5 shrink-0 text-primary/60" />
      <span>{children}</span>
    </p>
  );
}

// Character/word counter component
function Counter({ 
  current, 
  min, 
  max, 
  type = "chars" 
}: { 
  current: number; 
  min?: number; 
  max?: number;
  type?: "chars" | "words";
}) {
  const label = type === "words" ? "palavras" : "caracteres";
  const isUnderMin = min !== undefined && current < min;
  const isOverMax = max !== undefined && current > max;
  
  return (
    <span className={`text-xs ${isUnderMin ? "text-destructive" : isOverMax ? "text-amber-600" : "text-muted-foreground"}`}>
      {current} {label}
      {min !== undefined && ` (mín. ${min})`}
      {max !== undefined && ` / máx. ${max}`}
    </span>
  );
}

export default function OportunidadeModal({
  open,
  onClose,
  editingItem,
  onSuccess,
}: OportunidadeModalProps) {
  const { createOportunidade, updateOportunidade, isCreating, isUpdating } = useOportunidadesAdmin();
  const [error, setError] = useState<string | null>(null);
  const [conteudoOpen, setConteudoOpen] = useState(true);
  const [atualizacoesOpen, setAtualizacoesOpen] = useState(false);

  // Check if slug should be locked (after publication)
  const isSlugLocked = editingItem?.publicado === true;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: "",
      slug: "",
      categoria: "Concurso",
      tipo: "Concurso",
      escolaridades: ["Médio"],
      abrangencia: "Nacional",
      situacao: "Previsto",
      link_edital: "",
      orgao: "",
      banca: "",
      resumo_editorial: "",
      conteudo_markdown: "",
      conteudo_principal: "",
      meta_title: "",
      meta_description: "",
      data_publicacao: new Date().toISOString().split("T")[0],
      publicado: false,
      fontes: [],
      atualizacoes: [],
    },
  });

  const { fields: fontesFields, append: appendFonte, remove: removeFonte } = useFieldArray({
    control: form.control,
    name: "fontes",
  });

  const { fields: atualizacoesFields, append: appendAtualizacao, remove: removeAtualizacao } = useFieldArray({
    control: form.control,
    name: "atualizacoes",
  });

  useEffect(() => {
    if (editingItem) {
      // Normalize escolaridades: use new array if present, else convert legacy field
      const itemWithExt = editingItem as OportunidadeFormItem;
      const escolaridadesValue: ("Fundamental" | "Médio" | "Superior")[] = 
        itemWithExt.escolaridades?.length 
          ? itemWithExt.escolaridades 
          : itemWithExt.escolaridade ? [itemWithExt.escolaridade] : ["Médio"];
      
      // Load conteudo_markdown preferring it over conteudo_principal
      const conteudoMarkdown = itemWithExt.conteudo_markdown || itemWithExt.conteudo_principal || "";
      
      form.reset({
        titulo: editingItem.titulo,
        slug: editingItem.slug,
        categoria: editingItem.categoria,
        tipo: editingItem.tipo as "Concurso" | "Programa educacional" | "Processo seletivo" | "Processo Seletivo Simplificado",
        escolaridades: escolaridadesValue,
        abrangencia: editingItem.abrangencia,
        situacao: editingItem.situacao,
        link_edital: editingItem.link_edital || "",
        orgao: editingItem.orgao || "",
        banca: editingItem.banca || "",
        resumo_editorial: editingItem.resumo_editorial || "",
        conteudo_markdown: conteudoMarkdown,
        conteudo_principal: itemWithExt.conteudo_principal || "",
        meta_title: itemWithExt.meta_title || "",
        meta_description: itemWithExt.meta_description || "",
        data_publicacao: editingItem.data_publicacao?.split("T")[0] || new Date().toISOString().split("T")[0],
        publicado: editingItem.publicado,
        fontes: editingItem.fontes_oportunidade?.map(f => ({
          source_url: f.source_url,
          source_title: f.source_title || "",
          source_tipo: f.source_tipo,
          source_date: f.source_date?.split("T")[0] || "",
        })) || [],
        atualizacoes: itemWithExt.atualizacoes_oportunidade?.map((a) => ({
          data_atualizacao: a.data_atualizacao?.split("T")[0] || "",
          texto: a.texto || "",
        })) || [],
      });
    } else {
      form.reset({
        titulo: "",
        slug: "",
        categoria: "Concurso",
        tipo: "Concurso",
        escolaridades: ["Médio"],
        abrangencia: "Nacional",
        situacao: "Previsto",
        link_edital: "",
        orgao: "",
        banca: "",
        resumo_editorial: "",
        conteudo_markdown: "",
        conteudo_principal: "",
        meta_title: "",
        meta_description: "",
        data_publicacao: new Date().toISOString().split("T")[0],
        publicado: false,
        fontes: [],
        atualizacoes: [],
      });
    }
    setError(null);
  }, [editingItem, form, open]);

  // Auto-generate slug from title (only for new items or if slug is not locked)
  const titulo = form.watch("titulo");
  useEffect(() => {
    if (!isSlugLocked && titulo) {
      const newSlug = generateSlug(titulo);
      form.setValue("slug", newSlug);
    }
  }, [titulo, isSlugLocked, form]);

  // Watch fields for counters
  const resumoEditorial = form.watch("resumo_editorial") || "";
  const conteudoMarkdown = form.watch("conteudo_markdown") || "";
  const metaTitle = form.watch("meta_title") || "";
  const metaDescription = form.watch("meta_description") || "";
  const publicado = form.watch("publicado");
  
  const resumoCharCount = resumoEditorial.length;
  const conteudoWordCount = countWords(conteudoMarkdown);
  const titleCharCount = titulo.length;
  
  // Title warnings
  const titleWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (titleCharCount > 70) {
      warnings.push("Pode ser truncado nos resultados do Google");
    }
    if (isGenericTitle(titulo)) {
      warnings.push("Título muito genérico - adicione órgão/cargo/contexto");
    }
    return warnings;
  }, [titulo, titleCharCount]);

  const onSubmit = async (data: FormData) => {
    setError(null);
    
    try {
      // Generate meta_title from titulo if not provided
      let finalMetaTitle = data.meta_title;
      if (!finalMetaTitle && data.titulo) {
        finalMetaTitle = data.titulo.length > 65 
          ? data.titulo.substring(0, 62).replace(/\s+\S*$/, "") + "..."
          : data.titulo;
      }

      // Generate meta_description from resumo if not provided
      let finalMetaDescription = data.meta_description;
      if (!finalMetaDescription && data.resumo_editorial) {
        finalMetaDescription = data.resumo_editorial.length > 155
          ? data.resumo_editorial.substring(0, 152).replace(/\s+\S*$/, "") + "..."
          : data.resumo_editorial;
      }

      // Generate HTML from markdown
      const conteudoHtml = data.conteudo_markdown ? markdownToHtml(data.conteudo_markdown) : undefined;

      const payload: OportunidadePayload = {
        titulo: data.titulo,
        slug: data.slug,
        categoria: data.categoria,
        tipo: data.tipo,
        escolaridades: data.escolaridades, // New array field
        escolaridade: data.escolaridades[0], // Legacy compatibility
        abrangencia: data.abrangencia,
        situacao: data.situacao,
        publicado: data.publicado,
        id: editingItem?.id,
        link_edital: data.link_edital || undefined,
        orgao: data.orgao || undefined,
        banca: data.banca || undefined,
        resumo_editorial: data.resumo_editorial || undefined,
        conteudo_markdown: data.conteudo_markdown || undefined,
        conteudo_html: conteudoHtml,
        conteudo_principal: data.conteudo_markdown || data.conteudo_principal || undefined, // Legacy
        meta_title: finalMetaTitle || undefined,
        meta_description: finalMetaDescription || undefined,
        data_publicacao: data.data_publicacao ? new Date(data.data_publicacao).toISOString() : new Date().toISOString(),
        fontes: data.fontes.map(f => ({
          source_url: f.source_url,
          source_title: f.source_title || undefined,
          source_tipo: f.source_tipo,
          source_date: f.source_date ? new Date(f.source_date).toISOString() : undefined,
        })),
        atualizacoes: data.atualizacoes.map(a => ({
          data_atualizacao: a.data_atualizacao ? new Date(a.data_atualizacao).toISOString() : new Date().toISOString(),
          texto: a.texto,
        })),
      };

      if (editingItem) {
        await updateOportunidade(payload);
      } else {
        await createOportunidade(payload);
      }
      
      onSuccess();
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Erro ao salvar oportunidade"));
    }
  };

  const isLoading = isCreating || isUpdating;

  // Pre-publish validation summary
  const validationIssues = useMemo(() => {
    if (!publicado) return [];
    
    const issues: string[] = [];
    if (titleCharCount < 30) issues.push("Título < 30 caracteres");
    if (resumoCharCount < 300) issues.push("Resumo < 300 caracteres");
    if (conteudoWordCount < 600) issues.push("Conteúdo < 600 palavras");
    if (fontesFields.length === 0) issues.push("Sem fonte oficial");
    
    const situacao = form.watch("situacao");
    const linkEdital = form.watch("link_edital");
    if ((situacao === "Aberto" || situacao === "Edital publicado") && !linkEdital) {
      issues.push("Link do edital obrigatório");
    }
    
    return issues;
  }, [publicado, titleCharCount, resumoCharCount, conteudoWordCount, fontesFields.length, form]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? "Editar Oportunidade" : "Nova Oportunidade"}
          </DialogTitle>
          <DialogDescription>
            Preencha os campos seguindo as dicas de SEO para melhor indexação.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Título */}
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Concurso INSS 2025 — Técnico do Seguro Social" {...field} />
                  </FormControl>
                  <div className="flex items-center justify-between">
                    <SeoHint>Este título será o H1 da página e a base do Meta Title.</SeoHint>
                    <Counter current={titleCharCount} min={30} max={70} />
                  </div>
                  {titleWarnings.length > 0 && (
                    <div className="space-y-1 mt-1">
                      {titleWarnings.map((warning, i) => (
                        <p key={i} className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {warning}
                        </p>
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Slug */}
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Slug *
                    {isSlugLocked && (
                      <Badge variant="secondary" className="text-xs">
                        <Lock className="h-3 w-3 mr-1" />
                        Travado após publicação
                      </Badge>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="concurso-inss-2025-tecnico-seguro-social" 
                      {...field} 
                      disabled={isSlugLocked}
                      className={isSlugLocked ? "bg-muted" : ""}
                    />
                  </FormControl>
                  <SeoHint>
                    Gerado automaticamente a partir do título (minúsculo, sem acentos, sem stopwords).
                    {isSlugLocked && " Travado após publicação. Contate um administrador para alterar."}
                  </SeoHint>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Classification Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="categoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Concurso">Concurso</SelectItem>
                        <SelectItem value="Políticas Públicas">Políticas Públicas</SelectItem>
                        <SelectItem value="Educação">Educação</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Concurso">Concurso</SelectItem>
                        <SelectItem value="Programa educacional">Programa educacional</SelectItem>
                        <SelectItem value="Processo seletivo">Processo seletivo</SelectItem>
                        <SelectItem value="Processo Seletivo Simplificado">Processo Seletivo Simplificado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="escolaridades"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Escolaridade *</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {(["Fundamental", "Médio", "Superior"] as const).map(option => {
                        const isSelected = field.value?.includes(option);
                        return (
                          <Badge
                            key={option}
                            variant="outline"
                            className={`cursor-pointer transition-colors px-3 py-1 ${
                              isSelected ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
                            }`}
                            onClick={() => {
                              if (isSelected) {
                                // Remove only if there will be at least 1 remaining
                                if ((field.value?.length || 0) > 1) {
                                  field.onChange(field.value?.filter(v => v !== option));
                                }
                              } else {
                                field.onChange([...(field.value || []), option]);
                              }
                            }}
                            role="checkbox"
                            aria-checked={isSelected}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                if (isSelected) {
                                  if ((field.value?.length || 0) > 1) {
                                    field.onChange(field.value?.filter(v => v !== option));
                                  }
                                } else {
                                  field.onChange([...(field.value || []), option]);
                                }
                              }
                            }}
                          >
                            {option}
                          </Badge>
                        );
                      })}
                    </div>
                    <FormDescription className="text-xs">
                      Selecione uma ou mais escolaridades
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="abrangencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Abrangência *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Nacional">Nacional</SelectItem>
                        <SelectItem value="Estadual">Estadual</SelectItem>
                        <SelectItem value="Municipal">Municipal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="situacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Situação *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Previsto">Previsto</SelectItem>
                        <SelectItem value="Edital publicado">Edital publicado</SelectItem>
                        <SelectItem value="Aberto">Aberto</SelectItem>
                        <SelectItem value="Encerrado">Encerrado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_publicacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Publicação</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Órgão, Banca, Link Edital */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="link_edital"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>
                      Link do Edital
                      {(form.watch("situacao") === "Aberto" || form.watch("situacao") === "Edital publicado") && " *"}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="https://exemplo.gov.br/edital.pdf" {...field} />
                    </FormControl>
                    <FormDescription>
                      Obrigatório quando a situação é "Aberto" ou "Edital publicado"
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="orgao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Órgão</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: INSS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="banca"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banca</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: CEBRASPE" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Resumo Editorial */}
            <FormField
              control={form.control}
              name="resumo_editorial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resumo Editorial {publicado && "*"}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Segundo informações divulgadas pelo órgão responsável, o concurso prevê a abertura de..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <div className="flex items-center justify-between">
                    <SeoHint>
                      Resumo informativo e objetivo, com atribuição de fonte. 
                      Ex.: "Segundo informações divulgadas por...", "De acordo com...", "Conforme comunicado do...". 
                      3–5 linhas.
                    </SeoHint>
                    <Counter current={resumoCharCount} min={300} />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Conteúdo Principal - Collapsible */}
            <Collapsible open={conteudoOpen} onOpenChange={setConteudoOpen}>
              <CollapsibleTrigger asChild>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full justify-between p-0 h-auto hover:bg-transparent"
                >
                  <span className="font-medium text-base flex items-center gap-2">
                    Conteúdo Principal {publicado && "*"}
                    <Badge variant="outline" className="text-xs font-normal">
                      {conteudoWordCount} palavras
                    </Badge>
                  </span>
                  {conteudoOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <FormField
                  control={form.control}
                  name="conteudo_markdown"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <MarkdownEditor
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder={`## Sobre o concurso

Descreva aqui as informações gerais sobre o concurso, incluindo histórico e contexto.

## Cargos previstos

Liste os cargos disponíveis e quantas vagas para cada.

## Remuneração

Informe a faixa salarial e benefícios.

## Etapas da seleção

Descreva as etapas do processo seletivo (provas, fases, etc).

## Situação atual

Qual o status mais recente do concurso.

## O que já se sabe oficialmente

Informações confirmadas por fontes oficiais.`}
                          minWords={publicado ? 600 : 0}
                          rows={16}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Atualizações - Collapsible */}
            <Collapsible open={atualizacoesOpen} onOpenChange={setAtualizacoesOpen}>
              <CollapsibleTrigger asChild>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full justify-between p-0 h-auto hover:bg-transparent"
                >
                  <span className="font-medium text-base flex items-center gap-2">
                    Atualizações do Concurso
                    {atualizacoesFields.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {atualizacoesFields.length}
                      </Badge>
                    )}
                  </span>
                  {atualizacoesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-4">
                <SeoHint>
                  Campo repetível para atualizações do concurso (exibidas em ordem decrescente por data).
                </SeoHint>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendAtualizacao({
                    data_atualizacao: new Date().toISOString().split("T")[0],
                    texto: "",
                  })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Atualização
                </Button>

                {atualizacoesFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic text-center py-4 border rounded-md">
                    Nenhuma atualização adicionada
                  </p>
                ) : (
                  <div className="space-y-4">
                    {atualizacoesFields.map((field, index) => (
                      <div key={field.id} className="border rounded-md p-4 relative">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8"
                          onClick={() => removeAtualizacao(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        <div className="grid grid-cols-1 gap-4 pr-10">
                          <FormField
                            control={form.control}
                            name={`atualizacoes.${index}.data_atualizacao`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Data *</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`atualizacoes.${index}.texto`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Texto *</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Descreva a atualização..."
                                    rows={2}
                                    maxLength={400}
                                    {...field}
                                  />
                                </FormControl>
                                <Counter current={field.value?.length || 0} min={10} max={400} />
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Fontes */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium">Fontes {publicado && "*"}</h4>
                  <SeoHint>
                    Pelo menos 1 fonte oficial é obrigatória para publicar. As fontes serão exibidas publicamente.
                  </SeoHint>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendFonte({
                    source_url: "",
                    source_title: "",
                    source_tipo: "oficial",
                    source_date: "",
                  })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              {fontesFields.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-4 border rounded-md">
                  Nenhuma fonte adicionada
                </p>
              ) : (
                <div className="space-y-4">
                  {fontesFields.map((field, index) => (
                    <div key={field.id} className="border rounded-md p-4 relative">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={() => removeFonte(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-10">
                        <FormField
                          control={form.control}
                          name={`fontes.${index}.source_url`}
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>URL *</FormLabel>
                              <FormControl>
                                <Input placeholder="https://..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`fontes.${index}.source_title`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Título</FormLabel>
                              <FormControl>
                                <Input placeholder="Nome da fonte" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`fontes.${index}.source_tipo`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="oficial">Oficial</SelectItem>
                                  <SelectItem value="diario">Diário Oficial</SelectItem>
                                  <SelectItem value="banca">Banca</SelectItem>
                                  <SelectItem value="outro-oficial">Outro oficial</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`fontes.${index}.source_date`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data da Fonte</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {form.formState.errors.fontes?.root && (
                <p className="text-sm text-destructive mt-2">
                  {form.formState.errors.fontes.root.message}
                </p>
              )}
            </div>

            <Separator />

            {/* SEO Meta Fields - Optional */}
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="meta_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Title (opcional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Deixe vazio para usar o título principal" 
                        {...field} 
                      />
                    </FormControl>
                    <div className="flex items-center justify-between">
                      <SeoHint>
                        Título para resultados de busca. Se vazio, será gerado a partir do título.
                      </SeoHint>
                      <Counter current={metaTitle.length} max={70} />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="meta_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Description (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Deixe vazio para usar o resumo editorial"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <div className="flex items-center justify-between">
                      <SeoHint>
                        Descrição para resultados de busca. Se vazio, será derivada do resumo.
                      </SeoHint>
                      <Counter current={metaDescription.length} max={160} />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Publicar */}
            <FormField
              control={form.control}
              name="publicado"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel className="text-base">Publicar</FormLabel>
                    <FormDescription>
                      Tornar visível para o público. Requer validações completas.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Validation Summary */}
            {publicado && validationIssues.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-1">Não é possível publicar:</p>
                  <ul className="list-disc list-inside text-sm">
                    {validationIssues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                variant={publicado ? "default" : "secondary"}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingItem 
                  ? (publicado ? "Salvar e Publicar" : "Salvar Rascunho") 
                  : (publicado ? "Criar e Publicar" : "Salvar como Rascunho")
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
