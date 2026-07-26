"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  Archive,
  AlignCenter,
  AlignLeft,
  ArrowDownAZ,
  Bold,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Crown,
  Download,
  Edit3,
  Eye,
  Filter,
  GripVertical,
  Heading1,
  Italic,
  Layers3,
  Link2,
  Loader2,
  Mail,
  MailCheck,
  MailPlus,
  MailX,
  MoreVertical,
  Newspaper,
  Pencil,
  RefreshCw,
  Rows3,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  SortAsc,
  Sparkles,
  Star,
  Trash2,
  UserMinus,
  UserPlus,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Segment = "all" | "registered" | "standard" | "premium" | "newsletter" | "unsubscribed";
type OriginFilter = "all" | EmailContact["source"];
type NameSort = "recent" | "az" | "za";
type NewsletterFilter = "all" | "subscribed" | "not_subscribed" | "unsubscribed";
type ContactsFilterMenu = "plan" | "newsletter" | "origin" | "segment" | null;
type EmailComposerMode = "blocks" | "html";
type EmailBlockAlign = "left" | "center";
type EmailTextStyle = {
  bold?: boolean;
  italic?: boolean;
  href?: string;
};
type EmailBlock =
  | { id: string; type: "eyebrow"; content: string; align: EmailBlockAlign; style?: EmailTextStyle }
  | { id: string; type: "heading"; content: string; align: EmailBlockAlign; level: "h1" | "h2"; style?: EmailTextStyle }
  | { id: string; type: "paragraph"; content: string; align: EmailBlockAlign; style?: EmailTextStyle }
  | { id: string; type: "button"; label: string; href: string; align: EmailBlockAlign }
  | { id: string; type: "divider" };

type EmailContact = {
  id: string;
  email: string;
  name: string | null;
  userId: string | null;
  source: "registered" | "newsletter" | "purchase" | "premium" | "mixed";
  segments: Array<"registered" | "standard" | "premium" | "newsletter" | "unsubscribed">;
  createdAt: string | null;
};

type EmailTemplate = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subject: string;
  preheader: string | null;
  html_body: string;
  text_body: string | null;
  created_at: string;
};

type EmailCampaign = {
  id: string;
  name: string;
  campaign_type: string;
  status: string;
  subject: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
};

type OverviewResponse = {
  config: {
    resendApiKey: boolean;
    fromEmail: string | null;
    replyTo: string | null;
    maxSelectedRecipients: number;
  };
  templates: EmailTemplate[];
  campaigns: EmailCampaign[];
};

const segmentOptions: Array<{ value: Segment; label: string; description: string }> = [
  { value: "all", label: "Todos", description: "Todos os contatos encontrados" },
  { value: "registered", label: "Cadastrados", description: "Usuários com conta no sistema" },
  { value: "standard", label: "Padrão", description: "Usuários sem premium ativo" },
  { value: "premium", label: "Premium", description: "Usuários com assinatura ativa" },
  { value: "newsletter", label: "Newsletter", description: "Assinantes da newsletter" },
  { value: "unsubscribed", label: "Descadastrados", description: "Bloqueados para marketing" },
];

const originFilterOptions: Array<{ value: OriginFilter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "registered", label: "Conta" },
  { value: "newsletter", label: "Newsletter" },
  { value: "purchase", label: "Compra" },
  { value: "premium", label: "Premium" },
  { value: "mixed", label: "Híbrida" },
];

const segmentFilterOptions: Array<{ value: Segment; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "registered", label: "Cadastrado" },
  { value: "standard", label: "Padrão" },
  { value: "premium", label: "Premium" },
  { value: "newsletter", label: "Newsletter" },
  { value: "unsubscribed", label: "Descadastrado" },
];

const planViewOptions: Array<{ value: Segment; label: string; description: string }> = [
  { value: "all", label: "Todos", description: "Todos os contatos" },
  { value: "standard", label: "Padrão", description: "Usuários sem premium ativo" },
  { value: "premium", label: "Premium", description: "Usuários com assinatura ativa" },
];

const newsletterFilterOptions: Array<{ value: NewsletterFilter; label: string }> = [
  { value: "all", label: "Newsletter: todos" },
  { value: "subscribed", label: "Inscritos" },
  { value: "not_subscribed", label: "Não inscritos" },
  { value: "unsubscribed", label: "Descadastrados" },
];

const CONTACTS_PAGE_SIZE = 12;

const campaignTypeOptions = [
  { value: "newsletter", label: "Newsletter", description: "Curadorias, novidades e avisos úteis." },
  { value: "curation", label: "Curadoria", description: "Recomendação editorial com links e contexto." },
  { value: "promotion", label: "Promoção", description: "Ofertas, lançamentos e campanhas comerciais." },
  { value: "announcement", label: "Comunicado", description: "Avisos importantes sobre o PqEstudar." },
];

const segmentVisuals = {
  all: { icon: Layers3, color: "text-fuchsia-300", bg: "bg-fuchsia-500/15", ring: "ring-fuchsia-500/30" },
  registered: { icon: UserCheck, color: "text-sky-300", bg: "bg-sky-500/15", ring: "ring-sky-500/30" },
  standard: { icon: Users, color: "text-violet-300", bg: "bg-violet-500/15", ring: "ring-violet-500/30" },
  premium: { icon: Crown, color: "text-amber-300", bg: "bg-amber-500/15", ring: "ring-amber-500/30" },
  newsletter: { icon: Newspaper, color: "text-emerald-300", bg: "bg-emerald-500/15", ring: "ring-emerald-500/30" },
  unsubscribed: { icon: UserX, color: "text-rose-300", bg: "bg-rose-500/15", ring: "ring-rose-500/30" },
} satisfies Record<Segment, { icon: typeof Users; color: string; bg: string; ring: string }>;

const starterHtml = `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1f1f24;line-height:1.6">
  <p style="font-size:13px;color:#97008f;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Curadoria PqEstudar</p>
  <h1 style="font-size:30px;line-height:1.15;margin:0 0 16px">Uma seleção útil para estudar melhor</h1>
  <p>Olá! Separei uma recomendação rápida para te ajudar a encontrar ferramentas, conteúdos e oportunidades sem perder tempo.</p>
  <p>Veja o que faz sentido para sua rotina e salve o que quiser consultar depois.</p>
  <p>
    <a href="https://www.pqestudar.com.br" style="display:inline-block;background:#d936d0;color:#fff;text-decoration:none;padding:13px 18px;border-radius:12px;font-weight:700">
      Acessar o PqEstudar
    </a>
  </p>
</div>`;

const defaultEmailBlocks: EmailBlock[] = [
  { id: "eyebrow-default", type: "eyebrow", content: "Curadoria PqEstudar", align: "left" },
  {
    id: "heading-default",
    type: "heading",
    level: "h1",
    content: "Uma seleção útil para estudar melhor",
    align: "left",
  },
  {
    id: "paragraph-intro",
    type: "paragraph",
    content:
      "Olá! Separei uma recomendação rápida para te ajudar a encontrar ferramentas, conteúdos e oportunidades sem perder tempo.",
    align: "left",
  },
  {
    id: "paragraph-context",
    type: "paragraph",
    content: "Veja o que faz sentido para sua rotina e salve o que quiser consultar depois.",
    align: "left",
  },
  {
    id: "button-default",
    type: "button",
    label: "Acessar o PqEstudar",
    href: "https://www.pqestudar.com.br",
    align: "left",
  },
];

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getSourceLabel(source: EmailContact["source"]) {
  if (source === "mixed") return "Conta + Newsletter";
  if (source === "registered") return "Conta";
  if (source === "purchase") return "Compra";
  if (source === "premium") return "Premium";
  return "Newsletter";
}

function getPlanLabel(contact: EmailContact) {
  return contact.segments.includes("premium") ? "Premium" : "Padrão";
}

function getNewsletterLabel(contact: EmailContact) {
  if (contact.segments.includes("unsubscribed")) return "Descadastrado";
  if (contact.segments.includes("newsletter")) return "Inscrito";
  return "Não inscrito";
}

function getSegmentLabel(segment: EmailContact["segments"][number]) {
  const labels: Record<EmailContact["segments"][number], string> = {
    registered: "cadastrado",
    standard: "padrão",
    premium: "premium",
    newsletter: "newsletter",
    unsubscribed: "descadastrado",
  };

  return labels[segment];
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "Rascunho",
    sending: "Enviando",
    sent: "Enviado",
    failed: "Falhou",
    test_sent: "Teste enviado",
  };

  return labels[status] || status;
}

function getCampaignDeliveryStatus(campaign: EmailCampaign) {
  const total = campaign.total_recipients || 0;
  const sent = campaign.sent_count || 0;
  const failed = campaign.failed_count || 0;

  if (campaign.status === "failed" || (failed > 0 && sent === 0)) {
    return {
      label: "Falhou",
      detail: failed > 0 ? `${failed} falha(s)` : "Envio interrompido",
      icon: MailX,
      className: "border-red-500/25 bg-red-500/15 text-red-400",
      iconClassName: "",
    };
  }

  if (campaign.status === "sending" || sent < total) {
    return {
      label: "Pendente",
      detail: total > 0 ? `${sent}/${total} enviado(s)` : "Aguardando envio",
      icon: Loader2,
      className: "border-amber-500/25 bg-amber-500/15 text-amber-300",
      iconClassName: "animate-spin",
    };
  }

  return {
    label: "Concluído",
    detail: total > 0 ? `${sent} enviado(s)` : "Finalizado",
    icon: CheckCircle2,
    className: "border-emerald-500/25 bg-emerald-500/15 text-emerald-400",
    iconClassName: "",
  };
}

async function readJsonResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    if (!response.ok) {
      return {
        error: `A API respondeu ${response.status} sem detalhes. Verifique as variáveis de ambiente e faça um novo deploy.`,
      };
    }

    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    const cleanText = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const details = cleanText ? ` Resposta: ${cleanText.slice(0, 180)}` : "";

    return {
      error: response.ok
        ? "A resposta da API veio em um formato inesperado."
        : `A API não respondeu em JSON (${response.status}). Verifique as variáveis de ambiente e o deploy.${details}`,
    };
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderInlineContent(value: string, style?: EmailTextStyle) {
  let content = escapeHtml(value);

  if (style?.bold) {
    content = `<strong>${content}</strong>`;
  }

  if (style?.italic) {
    content = `<em>${content}</em>`;
  }

  const href = style?.href?.trim();
  if (href) {
    content = `<a href="${escapeHtml(href)}" style="color:#97008f;text-decoration:underline;font-weight:700">${content}</a>`;
  }

  return content;
}

function renderEmailBlocksToHtml(blocks: EmailBlock[]) {
  const body = blocks
    .map((block) => {
      if (block.type === "divider") {
        return `<hr style="border:0;border-top:1px solid #e5e7eb;margin:28px 0" />`;
      }

      const textAlign = `text-align:${block.align}`;

      if (block.type === "eyebrow") {
        return `<p style="${textAlign};font-size:13px;color:#97008f;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0 0 12px">${renderInlineContent(block.content, block.style)}</p>`;
      }

      if (block.type === "heading") {
        const size = block.level === "h1" ? "32px" : "24px";
        return `<${block.level} style="${textAlign};font-size:${size};line-height:1.15;margin:0 0 16px;color:#1f1f24">${renderInlineContent(block.content, block.style)}</${block.level}>`;
      }

      if (block.type === "paragraph") {
        return `<p style="${textAlign};font-size:16px;margin:0 0 16px;color:#1f1f24">${renderInlineContent(block.content, block.style)}</p>`;
      }

      return `<p style="${textAlign};margin:24px 0"><a href="${escapeHtml(block.href)}" style="display:inline-block;background:#d936d0;color:#fff;text-decoration:none;padding:13px 18px;border-radius:12px;font-weight:700">${escapeHtml(block.label)}</a></p>`;
    })
    .join("\n  ");

  return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1f1f24;line-height:1.6;padding:8px 0">
  ${body}
</div>`;
}

function renderEmailBlocksToText(blocks: EmailBlock[]) {
  return blocks
    .map((block) => {
      if (block.type === "divider") return "----------";
      if (block.type === "button") return `${block.label}: ${block.href}`;
      const href = block.style?.href?.trim();
      return href ? `${block.content}: ${href}` : block.content;
    })
    .filter(Boolean)
    .join("\n\n");
}

function getEmailBlockLabel(block: EmailBlock) {
  if (block.type === "eyebrow") return "Etiqueta";
  if (block.type === "heading") return block.level === "h1" ? "Título principal" : "Título de seção";
  if (block.type === "paragraph") return "Texto";
  if (block.type === "button") return "Botão";
  return "Divisor";
}

function getEmailBlockPreview(block: EmailBlock) {
  if (block.type === "divider") return "Linha separadora";
  if (block.type === "button") return `${block.label} → ${block.href}`;
  return block.content;
}

export default function AdminEmailsClient() {
  const [activeTab, setActiveTab] = useState("contacts");
  const [segment, setSegment] = useState<Segment>("all");
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [nameSort, setNameSort] = useState<NameSort>("recent");
  const [originFilter, setOriginFilter] = useState<OriginFilter>("all");
  const [segmentColumnFilter, setSegmentColumnFilter] = useState<Segment>("all");
  const [newsletterFilter, setNewsletterFilter] = useState<NewsletterFilter>("all");
  const [contactsPage, setContactsPage] = useState(1);
  const [showContactsFilters, setShowContactsFilters] = useState(false);
  const [showContactsMore, setShowContactsMore] = useState(false);
  const [showSelectMenu, setShowSelectMenu] = useState(false);
  const [openContactsFilter, setOpenContactsFilter] = useState<ContactsFilterMenu>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showCampaignTypePicker, setShowCampaignTypePicker] = useState(false);
  const [contacts, setContacts] = useState<EmailContact[]>([]);
  const [contactSourceErrors, setContactSourceErrors] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<Segment, number>>({
    all: 0,
    registered: 0,
    standard: 0,
    premium: 0,
    newsletter: 0,
    unsubscribed: 0,
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [testEmail, setTestEmail] = useState("pqestudar.suporte@gmail.com");

  const [campaignName, setCampaignName] = useState("Curadoria PqEstudar");
  const [campaignType, setCampaignType] = useState("newsletter");
  const [subject, setSubject] = useState("Novidades úteis do PqEstudar");
  const [preheader, setPreheader] = useState("Uma seleção rápida para estudar melhor e perder menos tempo.");
  const [htmlBody, setHtmlBody] = useState(starterHtml);
  const [textBody, setTextBody] = useState("Veja novidades úteis do PqEstudar: https://www.pqestudar.com.br");
  const [composerMode, setComposerMode] = useState<EmailComposerMode>("blocks");
  const [emailBlocks, setEmailBlocks] = useState<EmailBlock[]>(defaultEmailBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(defaultEmailBlocks[1]?.id || null);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);

  const visibleContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = contacts.filter((contact) => {
      const matchesMainSegment = segment === "all" || contact.segments.includes(segment);
      const matchesSearch =
        !query || contact.email.toLowerCase().includes(query) || contact.name?.toLowerCase().includes(query);
      const matchesOrigin = originFilter === "all" || contact.source === originFilter;
      const matchesColumnSegment =
        segmentColumnFilter === "all" || contact.segments.includes(segmentColumnFilter);
      const matchesNewsletter =
        newsletterFilter === "all" ||
        (newsletterFilter === "subscribed" && contact.segments.includes("newsletter")) ||
        (newsletterFilter === "not_subscribed" &&
          !contact.segments.includes("newsletter") &&
          !contact.segments.includes("unsubscribed")) ||
        (newsletterFilter === "unsubscribed" && contact.segments.includes("unsubscribed"));

      return matchesMainSegment && matchesSearch && matchesOrigin && matchesColumnSegment && matchesNewsletter;
    });

    return [...filtered].sort((a, b) => {
      if (nameSort === "az") return (a.name || a.email).localeCompare(b.name || b.email, "pt-BR");
      if (nameSort === "za") return (b.name || b.email).localeCompare(a.name || a.email, "pt-BR");
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });
  }, [contacts, nameSort, originFilter, search, segment, segmentColumnFilter, newsletterFilter]);

  const selectedContacts = useMemo(
    () => contacts.filter((contact) => selectedIds.has(contact.id)),
    [contacts, selectedIds],
  );

  const selectedTemplate = useMemo(() => {
    const templates = overview?.templates || [];
    return templates.find((template) => template.id === selectedTemplateId) || templates[0] || null;
  }, [overview?.templates, selectedTemplateId]);

  const totalContactPages = Math.max(1, Math.ceil(visibleContacts.length / CONTACTS_PAGE_SIZE));
  const paginatedContacts = useMemo(() => {
    const start = (contactsPage - 1) * CONTACTS_PAGE_SIZE;
    return visibleContacts.slice(start, start + CONTACTS_PAGE_SIZE);
  }, [contactsPage, visibleContacts]);
  const selectableContacts = useMemo(
    () => paginatedContacts.filter((contact) => !contact.segments.includes("unsubscribed")),
    [paginatedContacts],
  );
  const visibleSelectedCount = useMemo(
    () => selectableContacts.filter((contact) => selectedIds.has(contact.id)).length,
    [selectableContacts, selectedIds],
  );
  const allVisibleSelected = selectableContacts.length > 0 && visibleSelectedCount === selectableContacts.length;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;
  const contactRangeStart = visibleContacts.length === 0 ? 0 : (contactsPage - 1) * CONTACTS_PAGE_SIZE + 1;
  const contactRangeEnd = Math.min(contactsPage * CONTACTS_PAGE_SIZE, visibleContacts.length);
  const configReady = Boolean(overview?.config.resendApiKey && overview.config.fromEmail);
  const activeOriginFilter = originFilterOptions.find((option) => option.value === originFilter);
  const activeSegmentColumnFilter = segmentFilterOptions.find((option) => option.value === segmentColumnFilter);
  const activeNewsletterFilter = newsletterFilterOptions.find((option) => option.value === newsletterFilter);
  const planFilterOptions = [
    { value: "all" as Segment, label: "Plano: todos" },
    { value: "standard" as Segment, label: "Plano: Padrão" },
    { value: "premium" as Segment, label: "Plano: Premium" },
  ];
  const activePlanFilter = planFilterOptions.find((option) => option.value === segment);
  const activeCampaignType = campaignTypeOptions.find((option) => option.value === campaignType) || campaignTypeOptions[0]!;
  const selectedEmailBlock = emailBlocks.find((block) => block.id === selectedBlockId) || emailBlocks[0] || null;

  const syncEmailBlocks = (nextBlocks: EmailBlock[]) => {
    setEmailBlocks(nextBlocks);
    setHtmlBody(renderEmailBlocksToHtml(nextBlocks));
    setTextBody(renderEmailBlocksToText(nextBlocks));
  };

  const resetEmailBlocks = () => {
    const nextBlocks = defaultEmailBlocks.map((block) => ({ ...block }));
    syncEmailBlocks(nextBlocks);
    setSelectedBlockId(nextBlocks[1]?.id || nextBlocks[0]?.id || null);
    setComposerMode("blocks");
  };

  const updateEmailBlock = (id: string, patch: Partial<EmailBlock>) => {
    syncEmailBlocks(
      emailBlocks.map((block) => (block.id === id ? ({ ...block, ...patch } as EmailBlock) : block)),
    );
  };

  const updateEmailTextBlockStyle = (id: string, patch: EmailTextStyle) => {
    syncEmailBlocks(
      emailBlocks.map((block) => {
        if (block.id !== id || block.type === "button" || block.type === "divider") return block;

        return {
          ...block,
          style: {
            ...block.style,
            ...patch,
          },
        };
      }),
    );
  };

  const toggleEmailTextBlockStyle = (id: string, key: "bold" | "italic") => {
    syncEmailBlocks(
      emailBlocks.map((block) => {
        if (block.id !== id || block.type === "button" || block.type === "divider") return block;

        return {
          ...block,
          style: {
            ...block.style,
            [key]: !block.style?.[key],
          },
        };
      }),
    );
  };

  const toggleEmailTextBlockLink = (id: string) => {
    syncEmailBlocks(
      emailBlocks.map((block) => {
        if (block.id !== id || block.type === "button" || block.type === "divider") return block;

        const hasLink = Boolean(block.style?.href?.trim());

        return {
          ...block,
          style: {
            ...block.style,
            href: hasLink ? "" : "https://",
          },
        };
      }),
    );
  };

  const addEmailBlock = (type: EmailBlock["type"]) => {
    const id = `block-${Date.now()}`;
    const nextBlock: EmailBlock =
      type === "eyebrow"
        ? { id, type, content: "Nova etiqueta", align: "left" }
        : type === "heading"
          ? { id, type, level: "h2", content: "Novo título", align: "left" }
          : type === "paragraph"
            ? { id, type, content: "Escreva o texto deste bloco.", align: "left" }
            : type === "button"
              ? { id, type, label: "Acessar", href: "https://www.pqestudar.com.br", align: "left" }
              : { id, type: "divider" };

    syncEmailBlocks([...emailBlocks, nextBlock]);
    setSelectedBlockId(id);
    setComposerMode("blocks");
  };

  const removeEmailBlock = (id: string) => {
    const nextBlocks = emailBlocks.filter((block) => block.id !== id);
    syncEmailBlocks(nextBlocks);
    if (selectedBlockId === id) {
      setSelectedBlockId(nextBlocks[0]?.id || null);
    }
  };

  const moveEmailBlock = (id: string, direction: -1 | 1) => {
    const fromIndex = emailBlocks.findIndex((block) => block.id === id);
    const toIndex = fromIndex + direction;
    if (fromIndex < 0 || toIndex < 0 || toIndex >= emailBlocks.length) return;

    const nextBlocks = [...emailBlocks];
    const [moved] = nextBlocks.splice(fromIndex, 1);
    if (!moved) return;
    nextBlocks.splice(toIndex, 0, moved);
    syncEmailBlocks(nextBlocks);
  };

  const reorderEmailBlocks = (fromId: string, toId: string) => {
    const fromIndex = emailBlocks.findIndex((block) => block.id === fromId);
    const toIndex = emailBlocks.findIndex((block) => block.id === toId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

    const nextBlocks = [...emailBlocks];
    const [moved] = nextBlocks.splice(fromIndex, 1);
    if (!moved) return;
    nextBlocks.splice(toIndex, 0, moved);
    syncEmailBlocks(nextBlocks);
  };

  const cycleOriginFilter = () => {
    const currentIndex = originFilterOptions.findIndex((option) => option.value === originFilter);
    const next = originFilterOptions[(currentIndex + 1) % originFilterOptions.length];
    setOriginFilter(next.value);
  };

  const cycleSegmentColumnFilter = () => {
    const currentIndex = segmentFilterOptions.findIndex((option) => option.value === segmentColumnFilter);
    const next = segmentFilterOptions[(currentIndex + 1) % segmentFilterOptions.length];
    setSegmentColumnFilter(next.value);
  };

  const cycleNameSort = () => {
    setNameSort((current) => (current === "recent" ? "az" : current === "az" ? "za" : "recent"));
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(searchDraft);
  };

  const loadContacts = async () => {
    setLoadingContacts(true);
    try {
      const response = await fetch("/api/admin/emails/contacts");
      const data = await readJsonResponse(response);

      if (!response.ok) throw new Error(data.error || "Não foi possível carregar contatos.");

      setContacts(data.contacts || []);
      setCounts(
        data.counts || {
          all: 0,
          registered: 0,
          standard: 0,
          premium: 0,
          newsletter: 0,
          unsubscribed: 0,
        },
      );
      setContactSourceErrors(data.sourceErrors || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar contatos.");
      setContactSourceErrors([]);
    } finally {
      setLoadingContacts(false);
    }
  };

  const loadOverview = async () => {
    setLoadingOverview(true);
    try {
      const response = await fetch("/api/admin/emails/overview");
      const data = await readJsonResponse(response);

      if (!response.ok) throw new Error(data.error || "Não foi possível carregar dados da central.");

      setOverview(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar dados da central.");
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (!selectedTemplateId && overview?.templates?.[0]?.id) {
      setSelectedTemplateId(overview.templates[0].id);
    }
  }, [overview?.templates, selectedTemplateId]);

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    setContactsPage(1);
  }, [nameSort, originFilter, search, segment, segmentColumnFilter, newsletterFilter]);

  const toggleContact = (contact: EmailContact) => {
    if (contact.segments.includes("unsubscribed")) return;

    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(contact.id)) next.delete(contact.id);
      else next.add(contact.id);
      return next;
    });
  };

  const toggleVisibleSelection = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (visibleSelectedCount > 0) {
        selectableContacts.forEach((contact) => next.delete(contact.id));
        return next;
      }

      selectableContacts
        .slice(0, overview?.config.maxSelectedRecipients || 25)
        .forEach((contact) => next.add(contact.id));
      return next;
    });
  };

  const selectAllFilteredContacts = () => {
    const candidates = visibleContacts.filter((contact) => !contact.segments.includes("unsubscribed"));

    setSelectedIds((current) => {
      const next = new Set(current);
      candidates.forEach((contact) => next.add(contact.id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const closeContactsMenus = () => {
    setShowContactsMore(false);
    setShowSelectMenu(false);
    setOpenContactsFilter(null);
    setShowTemplatePicker(false);
    setShowCampaignTypePicker(false);
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-email-menu]")) {
        closeContactsMenus();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeContactsMenus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const applyTemplate = (template: EmailTemplate) => {
    setEditingTemplateId(template.id);
    setCampaignName(template.name);
    setCampaignType(template.category);
    setSubject(template.subject);
    setPreheader(template.preheader || "");
    setHtmlBody(template.html_body);
    setTextBody(template.text_body || "");
    setComposerMode("html");
    setActiveTab("compose");
    toast.success("Modelo aberto para edição.");
  };

  const createNewTemplate = () => {
    setEditingTemplateId(null);
    setCampaignName("Curadoria PqEstudar");
    setCampaignType("newsletter");
    setSubject("Novidades úteis do PqEstudar");
    setPreheader("Uma seleção rápida para estudar melhor e perder menos tempo.");
    resetEmailBlocks();
    setActiveTab("compose");
  };

  const saveTemplate = async () => {
    if (!campaignName.trim() || !subject.trim() || !htmlBody.trim()) {
      toast.error("Preencha nome, assunto e HTML antes de salvar.");
      return;
    }

    setSavingTemplate(true);
    try {
      const response = await fetch("/api/admin/emails/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingTemplateId,
          name: campaignName,
          category: campaignType,
          subject,
          preheader,
          htmlBody,
          textBody,
        }),
      });

      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar o modelo.");

      setEditingTemplateId(data.template.id);
      setSelectedTemplateId(data.template.id);
      toast.success("Modelo salvo. Ele já pode ser enviado pela aba Contatos.");
      await loadOverview();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o modelo.");
    } finally {
      setSavingTemplate(false);
    }
  };

  const deleteTemplate = async (template: EmailTemplate) => {
    if (!window.confirm(`Remover o modelo "${template.name}" da lista de templates?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/emails/templates?id=${encodeURIComponent(template.id)}`, {
        method: "DELETE",
      });

      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || "Não foi possível remover o modelo.");

      setSelectedTemplateId((current) => (current === template.id ? null : current));
      setEditingTemplateId((current) => (current === template.id ? null : current));
      toast.success("Modelo removido da lista.");
      await loadOverview();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover o modelo.");
    }
  };

  const sendEmail = async (mode: "test" | "selected") => {
    if (!selectedTemplate) {
      toast.error("Crie ou selecione um modelo antes de enviar.");
      return;
    }

    if (mode === "selected" && selectedContacts.length === 0) {
      toast.error("Selecione pelo menos um contato antes de enviar.");
      return;
    }

    if (
      mode === "selected" &&
      !window.confirm(`Enviar "${selectedTemplate.name}" para ${selectedContacts.length} contato(s) selecionado(s)?`)
    ) {
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/admin/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          testEmail,
          recipients: selectedContacts.map((contact) => ({
            email: contact.email,
            name: contact.name,
            userId: contact.userId,
            source: contact.source,
          })),
          campaign: {
            name: selectedTemplate.name,
            campaignType: selectedTemplate.category,
            subject: selectedTemplate.subject,
            preheader: selectedTemplate.preheader || "",
            htmlBody: selectedTemplate.html_body,
            textBody: selectedTemplate.text_body || "",
            audienceFilter: { segment, selectedCount: selectedContacts.length, templateId: selectedTemplate.id },
          },
        }),
      });

      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || "Não foi possível enviar o e-mail.");

      toast.success(`${data.sentCount} e-mail(s) enviado(s). ${data.failedCount ? `${data.failedCount} falharam.` : ""}`);
      loadOverview();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o e-mail.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Mail className="h-3.5 w-3.5" />
            Marketing
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Central de E-mails</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Controle contatos, monte campanhas, envie testes e acompanhe os primeiros disparos via Resend.
          </p>
        </div>

        <Button
          variant="outline"
          className="hidden"
          onClick={() => {
            loadContacts();
            loadOverview();
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <div className="hidden">
        <Card className="border-primary/10 bg-gradient-to-br from-primary/10 to-card">
          <CardContent className="flex items-center gap-3 p-5">
            <Users className="h-9 w-9 rounded-xl bg-primary/10 p-2 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Contatos</p>
              <p className="text-2xl font-bold">{counts.all}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-fuchsia-500/10 bg-gradient-to-br from-fuchsia-500/10 to-card">
          <CardContent className="flex items-center gap-3 p-5">
            <Sparkles className="h-9 w-9 rounded-xl bg-primary/10 p-2 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Selecionados</p>
              <p className="text-2xl font-bold">{selectedContacts.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/10 bg-gradient-to-br from-emerald-500/10 to-card">
          <CardContent className="flex items-center gap-3 p-5">
            <ShieldCheck className="h-9 w-9 rounded-xl bg-emerald-500/10 p-2 text-emerald-500" />
            <div>
              <p className="text-sm text-muted-foreground">Resend</p>
              <p className={cn("text-lg font-bold", configReady ? "text-emerald-500" : "text-amber-500")}>
                {configReady ? "Configurado" : "Pendente"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-violet-500/10 bg-gradient-to-br from-violet-500/10 to-card">
          <CardContent className="flex items-center gap-3 p-5">
            <Send className="h-9 w-9 rounded-xl bg-primary/10 p-2 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Campanhas</p>
              <p className="text-2xl font-bold">{overview?.campaigns.length || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-3xl border bg-background/35 p-1.5 shadow-inner md:grid-cols-5">
          <TabsTrigger value="contacts">Contatos</TabsTrigger>
          <TabsTrigger value="compose">Criar e-mail</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="space-y-4">
          <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-card via-card to-primary/5 shadow-2xl shadow-primary/5">
            <div className="hidden">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="hidden">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <Mail className="h-3.5 w-3.5" />
                    Mesa de disparo
                  </div>
                  <CardTitle className="text-2xl">Contatos e segmentos</CardTitle>
                  <CardDescription>Escolha a audiência, selecione um modelo e envie sem sair desta tela.</CardDescription>
                </div>
                <div className="grid grid-cols-3 gap-2 rounded-2xl border bg-background/40 p-2 text-center text-xs">
                  <div className="rounded-xl bg-primary/10 px-3 py-2 text-primary">
                    <p className="font-bold">1</p>
                    <p>Segmento</p>
                  </div>
                  <div className="rounded-xl bg-emerald-500/10 px-3 py-2 text-emerald-300">
                    <p className="font-bold">2</p>
                    <p>Modelo</p>
                  </div>
                  <div className="rounded-xl bg-amber-500/10 px-3 py-2 text-amber-300">
                    <p className="font-bold">3</p>
                    <p>Enviar</p>
                  </div>
                </div>
              </div>
            </div>
            <CardContent className="space-y-5 p-5">
              {contactSourceErrors.length > 0 && (
                <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">
                  <div className="flex gap-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <div>
                      <p className="font-semibold text-amber-200">Algumas fontes de contato não foram carregadas.</p>
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-amber-100/85">
                        {contactSourceErrors.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="hidden">
                <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px] xl:items-stretch">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="rounded-2xl bg-primary/20 p-3 text-primary ring-1 ring-primary/30">
                        <Mail className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-lg font-black">Modelo de envio</p>
                        <p className="text-sm text-muted-foreground">O conteúdo usado no teste e no disparo selecionado.</p>
                      </div>
                    </div>

                    {overview?.templates.length ? (
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,420px)]">
                        <div className="space-y-2">
                          <Label>Modelo</Label>
                          <div className="relative" data-email-menu>
                            <button
                              type="button"
                              onClick={() => setShowTemplatePicker((value) => !value)}
                              className="flex h-14 w-full items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-background/80 px-4 text-left text-sm font-bold shadow-inner outline-none transition hover:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/40"
                            >
                              <span className="min-w-0">
                                <span className="block truncate">{selectedTemplate?.name || "Escolher modelo"}</span>
                                <span className="block truncate text-xs font-medium text-muted-foreground">
                                  {selectedTemplate?.subject || "Selecione um template salvo"}
                                </span>
                              </span>
                              <ChevronDown className={cn("h-4 w-4 shrink-0 transition", showTemplatePicker && "rotate-180")} />
                            </button>
                            {showTemplatePicker && (
                              <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-full overflow-hidden rounded-2xl border bg-popover p-1 shadow-2xl shadow-black/25">
                                {overview.templates.map((template) => (
                                  <button
                                    key={template.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedTemplateId(template.id);
                                      setShowTemplatePicker(false);
                                    }}
                                    className={cn(
                                      "flex w-full flex-col rounded-xl px-3 py-2 text-left transition hover:bg-primary/10",
                                      selectedTemplateId === template.id && "bg-primary/15 text-primary",
                                    )}
                                  >
                                    <span className="font-bold">{template.name}</span>
                                    <span className="line-clamp-1 text-xs text-muted-foreground">{template.subject}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="hidden rounded-2xl border border-white/10 bg-background/60 p-4 shadow-inner">
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0">
                              <Badge variant="secondary" className="mb-2 border-primary/20 bg-primary/10 text-primary">
                                {selectedTemplate?.category || "modelo"}
                              </Badge>
                              <p className="truncate font-semibold">{selectedTemplate?.subject || "Sem assunto"}</p>
                              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                {selectedTemplate?.preheader || selectedTemplate?.description || "Sem prévia cadastrada."}
                              </p>
                            </div>
                            {selectedTemplate && (
                              <Button variant="outline" size="sm" onClick={() => applyTemplate(selectedTemplate)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
                        Nenhum modelo salvo ainda. Crie um modelo antes de enviar campanhas.
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 shadow-xl shadow-emerald-500/5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-emerald-200">Pronto para envio</p>
                        <p className="text-xs text-muted-foreground">{selectedContacts.length} contato(s) selecionado(s)</p>
                      </div>
                      <span className={cn("rounded-full px-3 py-1 text-xs font-bold", configReady ? "bg-emerald-500/20 text-emerald-200" : "bg-amber-500/20 text-amber-200")}>
                        {configReady ? "Resend ativo" : "Configurar Resend"}
                      </span>
                    </div>
                    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                      <Input value={testEmail} onChange={(event) => setTestEmail(event.target.value)} type="email" aria-label="E-mail de teste" className="h-12 border-emerald-500/20 bg-background/70" />
                      <Button onClick={() => sendEmail("test")} disabled={sending || !configReady || !selectedTemplate} variant="outline" className="h-12 border-emerald-500/30 bg-background/40 px-5">
                        {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Code2 className="mr-2 h-4 w-4" />}
                        Testar
                      </Button>
                      <Button onClick={() => sendEmail("selected")} disabled={sending || !configReady || !selectedTemplate || selectedContacts.length === 0} className="h-12 bg-emerald-500 px-5 text-emerald-950 hover:bg-emerald-400">
                        <Send className="mr-2 h-4 w-4" />
                        Enviar
                      </Button>
                    </div>
                  </div>
                </div>

                {!configReady && (
                  <div className="mt-4 flex gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    Configure RESEND_API_KEY e RESEND_FROM_EMAIL no ambiente antes de enviar.
                  </div>
                )}
              </div>

              <div className="hidden">
                {segmentOptions.map((option) => (
                  (() => {
                    const visual = segmentVisuals[option.value];
                    const Icon = visual.icon;
                    const active = segment === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSegment(option.value)}
                        className={cn(
                          "group relative overflow-hidden rounded-2xl border p-4 text-left transition duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-xl hover:shadow-primary/10",
                          active && "border-primary/70 bg-primary/10 ring-1 ring-primary/30",
                        )}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-primary/10 opacity-0 transition group-hover:opacity-100" />
                        <div className="relative flex items-start justify-between gap-3">
                          <span className={cn("rounded-2xl p-2 ring-1", visual.bg, visual.color, active ? "ring-primary/40" : visual.ring)}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="text-2xl font-black leading-none">{counts[option.value] || 0}</span>
                        </div>
                        <span className="relative mt-4 block text-sm font-bold">{option.label}</span>
                        <span className="relative mt-1 block min-h-8 text-xs leading-relaxed text-muted-foreground">{option.description}</span>
                      </button>
                    );
                  })()
                ))}
              </div>

                <div className="overflow-hidden rounded-[28px] border border-primary/15 bg-card/70 shadow-2xl shadow-primary/5">
                  <form
                    onSubmit={submitSearch}
                    className="flex items-center gap-3 border-b border-primary/10 bg-card/50 px-4 py-3"
                  >
                  <div className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-full border border-primary/15 bg-background/60 px-4 shadow-inner shadow-primary/5 lg:max-w-3xl">
                    <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <Input
                      value={searchDraft}
                      onChange={(event) => setSearchDraft(event.target.value)}
                      placeholder="Pesquisar e-mail"
                      className="h-10 min-w-0 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn("h-9 w-9 shrink-0 rounded-full", showContactsFilters && "bg-primary/15 text-primary")}
                      onClick={() => setShowContactsFilters((value) => !value)}
                      aria-label="Filtros de pesquisa"
                    >
                      <SlidersHorizontal className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
                    <span
                      className={cn(
                        "rounded-full border px-3 py-1.5 font-bold",
                        configReady ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" : "border-amber-500/25 bg-amber-500/10 text-amber-300",
                      )}
                    >
                      Resend {configReady ? "ativo" : "pendente"}
                    </span>
                  </div>
                </form>

                {contactSourceErrors.length > 0 && (
                  <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-100">
                    <span className="font-bold">Algumas fontes não foram carregadas.</span>{" "}
                    {contactSourceErrors.map((error) => (
                      <span key={error} className="mr-2 inline-block text-amber-200/90">
                        {error}
                      </span>
                    ))}
                  </div>
                )}

                {selectedContacts.length > 0 ? (
                  <div className="flex h-12 items-center gap-2 border-b border-primary/20 bg-primary/10 px-4 text-sm">
                    <Checkbox
                      checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                      onCheckedChange={toggleVisibleSelection}
                      disabled={selectableContacts.length === 0}
                      aria-label="Selecionar contatos visíveis"
                    />
                    <span className="mr-2 font-bold text-primary">{selectedContacts.length} selecionado(s)</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 rounded-full border border-primary/20 bg-primary/10 px-3 text-primary hover:bg-primary/15"
                      title="Selecionar todos do segmento ou filtro atual"
                      onClick={selectAllFilteredContacts}
                    >
                      Todos do filtro
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 rounded-full border border-primary/20 bg-background/35 px-3 text-muted-foreground hover:bg-background/60 hover:text-foreground"
                      title="Limpar todos os contatos selecionados"
                      onClick={clearSelection}
                    >
                      <UserX className="mr-2 h-4 w-4" />
                      Limpar seleção
                    </Button>
                    <Button
                      type="button"
                      onClick={() => sendEmail("selected")}
                      disabled={sending || !configReady || !selectedTemplate}
                      className="h-9 rounded-full bg-primary px-4 text-primary-foreground hover:bg-primary/90"
                    >
                      {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MailPlus className="mr-2 h-4 w-4" />}
                      Criar campanha com selecionados
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full" title="Adicionar a segmento" onClick={() => toast.info("Segmentação em massa será conectada na próxima etapa.")}>
                      <UserPlus className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full" title="Remover de segmento" onClick={() => toast.info("Remoção de segmento será conectada na próxima etapa.")}>
                      <UserMinus className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full" title="Inscrever na newsletter" onClick={() => toast.info("Inscrição em newsletter será conectada na próxima etapa.")}>
                      <MailCheck className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full" title="Remover da newsletter" onClick={() => toast.info("Remoção da newsletter será conectada na próxima etapa.")}>
                      <MailX className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full" title="Exportar" onClick={() => toast.info("Exportação será conectada na próxima etapa.")}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full" title="Bloquear marketing" onClick={() => toast.info("Bloqueio de marketing será conectado na próxima etapa.")}>
                      <ShieldCheck className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full text-destructive hover:text-destructive" title="Excluir" onClick={() => toast.info("Exclusão em massa será conectada com confirmação.")}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="ml-auto" />
                  </div>
                ) : (
                  <div className="flex h-12 items-center gap-2 border-b border-primary/10 bg-card/40 px-4 text-muted-foreground">
                    <div className="relative flex items-center" data-email-menu>
                      <Checkbox
                        checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                        onCheckedChange={toggleVisibleSelection}
                        disabled={selectableContacts.length === 0}
                        aria-label="Selecionar contatos visíveis"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setShowSelectMenu((value) => !value)}
                        aria-label="Opções de seleção"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      {showSelectMenu && (
                        <div className="absolute left-0 top-[calc(100%+8px)] z-40 w-80 overflow-hidden rounded-2xl border border-primary/20 bg-card p-1.5 shadow-2xl shadow-primary/10">
                          <button
                            type="button"
                            className="w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-primary/10"
                            onClick={() => {
                              toggleVisibleSelection();
                              setShowSelectMenu(false);
                            }}
                          >
                            Selecionar contatos visíveis
                          </button>
                          <button
                            type="button"
                            className="w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-primary/10"
                            onClick={() => {
                              selectAllFilteredContacts();
                              setShowSelectMenu(false);
                            }}
                          >
                            Selecionar todos do filtro atual
                          </button>
                          {selectedIds.size > 0 && (
                            <button
                              type="button"
                              className="w-full rounded-lg px-3 py-2 text-left text-sm text-destructive transition hover:bg-destructive/10"
                              onClick={() => {
                                clearSelection();
                                setShowSelectMenu(false);
                              }}
                            >
                              Limpar seleção
                            </button>
                          )}
                          <p className="px-3 py-2 text-xs text-muted-foreground">
                            A seleção total usa todos os contatos do segmento/filtro atual, não apenas esta página.
                          </p>
                        </div>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onClick={() => {
                        loadContacts();
                        loadOverview();
                      }}
                      title="Atualizar"
                      aria-label="Atualizar contatos"
                    >
                      <RefreshCw className={cn("h-4 w-4", loadingContacts && "animate-spin")} />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn("h-9 w-9 rounded-full", showContactsFilters && "bg-primary/15 text-primary")}
                      onClick={() => setShowContactsFilters((value) => !value)}
                      title="Filtros"
                      aria-label="Filtros"
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={cycleNameSort} title="Ordenar" aria-label="Ordenar">
                      <SortAsc className="h-4 w-4" />
                    </Button>

                    <div className="relative" data-email-menu>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full"
                        onClick={() => setShowContactsMore((value) => !value)}
                        title="Mais opções"
                        aria-label="Mais opções"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {showContactsMore && (
                        <div className="absolute left-0 top-[calc(100%+8px)] z-40 w-64 rounded-2xl border border-primary/20 bg-popover p-2 shadow-2xl shadow-primary/10">
                          <button
                            type="button"
                            className="w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-primary/10"
                            onClick={() => {
                              setSearch("");
                              setSearchDraft("");
                              setOriginFilter("all");
                              setSegmentColumnFilter("all");
                              setNewsletterFilter("all");
                              setSegment("all");
                              setShowContactsMore(false);
                            }}
                          >
                            Limpar filtros
                          </button>
                          <button
                            type="button"
                            className="w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-primary/10"
                            onClick={() => {
                              void sendEmail("test");
                              setShowContactsMore(false);
                            }}
                          >
                            Enviar teste para o e-mail padrão
                          </button>
                        </div>
                      )}
                    </div>

                    <span className="ml-auto whitespace-nowrap text-xs">
                      {contactRangeStart}-{contactRangeEnd} de {visibleContacts.length}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      disabled={contactsPage <= 1}
                      onClick={() => setContactsPage((page) => Math.max(1, page - 1))}
                      aria-label="Página anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      disabled={contactsPage >= totalContactPages}
                      onClick={() => setContactsPage((page) => Math.min(totalContactPages, page + 1))}
                      aria-label="Próxima página"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {showContactsFilters && selectedContacts.length === 0 && (
                  <div className="flex flex-wrap items-center gap-2 border-b border-primary/10 bg-background/45 px-4 py-3 text-sm" data-email-menu>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenContactsFilter((current) => (current === "plan" ? null : "plan"))}
                        className="flex h-10 min-w-40 items-center justify-between gap-3 rounded-full border border-primary/20 bg-background/70 px-4 font-semibold transition hover:border-primary/40 hover:bg-primary/10"
                      >
                        <span>{activePlanFilter?.label || "Plano: todos"}</span>
                        <ChevronDown className={cn("h-4 w-4 transition", openContactsFilter === "plan" && "rotate-180")} />
                      </button>
                      {openContactsFilter === "plan" && (
                        <div className="absolute left-0 top-[calc(100%+8px)] z-40 w-56 overflow-hidden rounded-2xl border border-primary/20 bg-popover p-1 shadow-2xl shadow-primary/10">
                          {planFilterOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setSegment(option.value);
                                setOpenContactsFilter(null);
                              }}
                              className={cn(
                                "w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-primary/10",
                                segment === option.value && "bg-primary/15 text-primary",
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenContactsFilter((current) => (current === "newsletter" ? null : "newsletter"))}
                        className="flex h-10 min-w-44 items-center justify-between gap-3 rounded-full border border-primary/20 bg-background/70 px-4 font-semibold transition hover:border-primary/40 hover:bg-primary/10"
                      >
                        <span>{activeNewsletterFilter?.label || "Newsletter: todos"}</span>
                        <ChevronDown className={cn("h-4 w-4 transition", openContactsFilter === "newsletter" && "rotate-180")} />
                      </button>
                      {openContactsFilter === "newsletter" && (
                        <div className="absolute left-0 top-[calc(100%+8px)] z-40 w-60 overflow-hidden rounded-2xl border border-primary/20 bg-popover p-1 shadow-2xl shadow-primary/10">
                          {newsletterFilterOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setNewsletterFilter(option.value);
                                setOpenContactsFilter(null);
                              }}
                              className={cn(
                                "w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-primary/10",
                                newsletterFilter === option.value && "bg-primary/15 text-primary",
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenContactsFilter((current) => (current === "origin" ? null : "origin"))}
                        className="flex h-10 min-w-44 items-center justify-between gap-3 rounded-full border border-primary/20 bg-background/70 px-4 font-semibold transition hover:border-primary/40 hover:bg-primary/10"
                      >
                        <span>Origem: {activeOriginFilter?.label || "Todas"}</span>
                        <ChevronDown className={cn("h-4 w-4 transition", openContactsFilter === "origin" && "rotate-180")} />
                      </button>
                      {openContactsFilter === "origin" && (
                        <div className="absolute left-0 top-[calc(100%+8px)] z-40 w-60 overflow-hidden rounded-2xl border border-primary/20 bg-popover p-1 shadow-2xl shadow-primary/10">
                          {originFilterOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setOriginFilter(option.value);
                                setOpenContactsFilter(null);
                              }}
                              className={cn(
                                "w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-primary/10",
                                originFilter === option.value && "bg-primary/15 text-primary",
                              )}
                            >
                              Origem: {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenContactsFilter((current) => (current === "segment" ? null : "segment"))}
                        className="flex h-10 min-w-48 items-center justify-between gap-3 rounded-full border border-primary/20 bg-background/70 px-4 font-semibold transition hover:border-primary/40 hover:bg-primary/10"
                      >
                        <span>Segmento: {activeSegmentColumnFilter?.label || "Todos"}</span>
                        <ChevronDown className={cn("h-4 w-4 transition", openContactsFilter === "segment" && "rotate-180")} />
                      </button>
                      {openContactsFilter === "segment" && (
                        <div className="absolute left-0 top-[calc(100%+8px)] z-40 w-64 overflow-hidden rounded-2xl border border-primary/20 bg-popover p-1 shadow-2xl shadow-primary/10">
                          {segmentFilterOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setSegmentColumnFilter(option.value);
                                setOpenContactsFilter(null);
                              }}
                              className={cn(
                                "w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-primary/10",
                                segmentColumnFilter === option.value && "bg-primary/15 text-primary",
                              )}
                            >
                              Segmento: {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <select value={segment} onChange={(event) => setSegment(event.target.value as Segment)} className="hidden">
                      <option value="all">Plano: todos</option>
                      <option value="standard">Plano: Padrão</option>
                      <option value="premium">Plano: Premium</option>
                    </select>
                    <select value={newsletterFilter} onChange={(event) => setNewsletterFilter(event.target.value as NewsletterFilter)} className="hidden">
                      {newsletterFilterOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <select value={originFilter} onChange={(event) => setOriginFilter(event.target.value as OriginFilter)} className="hidden">
                      {originFilterOptions.map((option) => (
                        <option key={option.value} value={option.value}>Origem: {option.label}</option>
                      ))}
                    </select>
                    <select value={segmentColumnFilter} onChange={(event) => setSegmentColumnFilter(event.target.value as Segment)} className="hidden">
                      {segmentFilterOptions.map((option) => (
                        <option key={option.value} value={option.value}>Segmento: {option.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-4 border-b border-primary/10 bg-card/35">
                  {[
                    { value: "all" as Segment, label: "Todos", icon: Layers3, count: counts.all || 0 },
                    { value: "standard" as Segment, label: "Padrão", icon: Users, count: counts.standard || 0 },
                    { value: "premium" as Segment, label: "Premium", icon: Crown, count: counts.premium || 0 },
                    { value: "newsletter" as Segment, label: "Newsletter", icon: Newspaper, count: counts.newsletter || 0 },
                  ].map((view) => {
                    const Icon = view.icon;
                    const active = segment === view.value;
                    return (
                      <button
                        key={view.value}
                        type="button"
                        onClick={() => {
                          setSegment(view.value);
                          setNewsletterFilter(view.value === "newsletter" ? "subscribed" : "all");
                        }}
                        className={cn(
                          "relative flex h-14 items-center gap-3 px-5 text-left text-sm transition hover:bg-primary/5",
                          active ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="font-semibold">{view.label}</span>
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs">{view.count}</span>
                        {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
                      </button>
                    );
                  })}
                </div>

                <div className="min-h-[420px] divide-y divide-primary/10 bg-card/25">
                  {loadingContacts ? (
                    <div className="flex h-60 items-center justify-center gap-3 text-sm text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Carregando contatos...
                    </div>
                  ) : paginatedContacts.length === 0 ? (
                    <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
                      Nenhum contato encontrado.
                    </div>
                  ) : (
                    paginatedContacts.map((contact) => {
                      const selected = selectedIds.has(contact.id);
                      const disabled = contact.segments.includes("unsubscribed");
                      const planLabel = getPlanLabel(contact);
                      const newsletterLabel = getNewsletterLabel(contact);
                      const extraSegments = contact.segments
                        .filter((item) => !["standard", "premium"].includes(item))
                        .map(getSegmentLabel)
                        .join(", ");

                      return (
                        <div
                          key={contact.id}
                          className={cn(
                            "group grid min-h-12 grid-cols-[36px_28px_minmax(140px,220px)_minmax(0,1fr)_96px] items-center gap-2 px-4 text-sm transition hover:bg-primary/5",
                            selected && "bg-primary/10 hover:bg-primary/15",
                            disabled && "opacity-60",
                          )}
                        >
                          <Checkbox
                            checked={selected}
                            disabled={disabled}
                            onCheckedChange={() => toggleContact(contact)}
                            aria-label={`Selecionar ${contact.email}`}
                          />
                          <Star className="h-4 w-4 text-muted-foreground/35 transition group-hover:text-amber-300/80" />
                          <div className="min-w-0 truncate font-semibold text-foreground">
                            {contact.name || contact.email}
                          </div>
                          <div className="min-w-0 truncate text-muted-foreground">
                            <span className="font-semibold text-foreground">{contact.email}</span>
                            <span> — {getSourceLabel(contact.source)}</span>
                            <span> · {planLabel}</span>
                            <span> · Newsletter: {newsletterLabel}</span>
                            {extraSegments && <span> · {extraSegments}</span>}
                          </div>
                          <div className="justify-self-end text-right text-xs font-semibold text-muted-foreground">
                            <span className="group-hover:hidden">{formatDate(contact.createdAt)}</span>
                            <div className="hidden items-center justify-end gap-1 group-hover:flex">
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full text-emerald-300" title="Enviar e-mail" onClick={() => toast.info(`Envio individual para ${contact.email} será conectado na próxima etapa.`)}>
                                <Send className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="Abrir detalhes" onClick={() => toast.info(`Detalhes de ${contact.email} serão conectados na próxima etapa.`)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="Editar segmentos" onClick={() => toast.info(`Edição de segmentos para ${contact.email} será conectada na próxima etapa.`)}>
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="Mais opções" onClick={() => toast.info("Mais ações serão conectadas na próxima etapa.")}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="hidden">
                <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-background/35 p-3">
                  {planViewOptions.map((option) => {
                    const active = segment === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSegment(option.value)}
                        className={cn(
                          "rounded-2xl border px-4 py-2.5 text-left transition hover:border-primary/40 hover:bg-primary/10",
                          active
                            ? "border-primary/70 bg-primary/15 text-primary shadow-lg shadow-primary/10"
                            : "border-border/70 bg-background/40 text-muted-foreground",
                        )}
                      >
                        <span className="block text-sm font-black">{option.label}</span>
                        <span className="block text-xs">{counts[option.value] || 0} contatos</span>
                      </button>
                    );
                  })}
                </div>

                <div className="border-b border-border/70 bg-background/20 p-3">
                  {selectedContacts.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Checkbox
                        checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                        onCheckedChange={toggleVisibleSelection}
                        disabled={selectableContacts.length === 0}
                        aria-label="Selecionar contatos visíveis"
                      />
                      <span className="mr-2 rounded-full bg-primary/15 px-3 py-1 text-sm font-bold text-primary">
                        {selectedContacts.length} selecionado(s)
                      </span>
                      <Button
                        type="button"
                        onClick={() => sendEmail("selected")}
                        disabled={sending || !configReady || !selectedTemplate}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MailPlus className="mr-2 h-4 w-4" />}
                        Criar campanha com selecionados
                      </Button>
                      <Button type="button" variant="outline" onClick={() => toast.info("Segmentação em massa será conectada na próxima etapa.")}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Adicionar a segmento
                      </Button>
                      <Button type="button" variant="outline" onClick={() => toast.info("Remoção de segmento será conectada na próxima etapa.")}>
                        <UserMinus className="mr-2 h-4 w-4" />
                        Remover de segmento
                      </Button>
                      <Button type="button" variant="outline" onClick={() => toast.info("Inscrição em newsletter será conectada na próxima etapa.")}>
                        <MailCheck className="mr-2 h-4 w-4" />
                        Inscrever
                      </Button>
                      <Button type="button" variant="outline" onClick={() => toast.info("Remoção da newsletter será conectada na próxima etapa.")}>
                        <MailX className="mr-2 h-4 w-4" />
                        Remover newsletter
                      </Button>
                      <Button type="button" variant="outline" onClick={() => toast.info("Exportação será conectada na próxima etapa.")}>
                        <Download className="mr-2 h-4 w-4" />
                        Exportar
                      </Button>
                      <Button type="button" variant="outline" onClick={() => toast.info("Arquivamento será conectado na próxima etapa.")}>
                        <Archive className="mr-2 h-4 w-4" />
                        Arquivar
                      </Button>
                      <Button type="button" variant="destructive" onClick={() => toast.info("Exclusão em massa será conectada com confirmação.")}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </Button>
                      <Button type="button" variant="ghost" className="ml-auto" onClick={clearSelection}>
                        Limpar seleção
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={submitSearch} className="flex flex-wrap items-center gap-2">
                      <div className="relative flex items-center gap-1 rounded-2xl border border-border/70 bg-background/50 px-2 py-1">
                        <Checkbox
                          checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                          onCheckedChange={toggleVisibleSelection}
                          disabled={selectableContacts.length === 0}
                          aria-label="Selecionar contatos visíveis"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setShowSelectMenu((value) => !value)}
                          aria-label="Selecionar todos os resultados"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        {showSelectMenu && (
                          <div className="absolute left-0 top-[calc(100%+8px)] z-40 w-72 rounded-2xl border bg-popover p-2 shadow-2xl shadow-black/30">
                            <button
                              type="button"
                              className="w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-primary/10"
                              onClick={() => {
                                toggleVisibleSelection();
                                setShowSelectMenu(false);
                              }}
                            >
                              Selecionar contatos visíveis
                            </button>
                            <button
                              type="button"
                              className="w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-primary/10"
                              onClick={() => {
                                const next = new Set(selectedIds);
                                visibleContacts
                                  .filter((contact) => !contact.segments.includes("unsubscribed"))
                                  .slice(0, overview?.config.maxSelectedRecipients || 25)
                                  .forEach((contact) => next.add(contact.id));
                                setSelectedIds(next);
                                setShowSelectMenu(false);
                              }}
                            >
                              Selecionar todos os resultados
                            </button>
                            <p className="px-3 py-2 text-xs text-muted-foreground">
                              Limite atual: {overview?.config.maxSelectedRecipients || 25} destinatários por disparo.
                            </p>
                          </div>
                        )}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          loadContacts();
                          loadOverview();
                        }}
                        aria-label="Atualizar contatos"
                      >
                        <RefreshCw className={cn("h-4 w-4", loadingContacts && "animate-spin")} />
                      </Button>

                      <div className="relative min-w-[260px] flex-1 lg:max-w-2xl">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={searchDraft}
                          onChange={(event) => setSearchDraft(event.target.value)}
                          placeholder="Buscar por nome ou e-mail"
                          className="h-11 rounded-2xl border-primary/10 bg-background/70 pl-9"
                        />
                      </div>

                      <Button type="submit" variant="outline" size="icon" className="h-11 w-11 rounded-2xl" aria-label="Buscar">
                        <Search className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className={cn("h-11 w-11 rounded-2xl", showContactsFilters && "border-primary/60 bg-primary/10 text-primary")}
                        onClick={() => setShowContactsFilters((value) => !value)}
                        aria-label="Filtros"
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-2xl" onClick={cycleNameSort} aria-label="Ordenar">
                        <SortAsc className="h-4 w-4" />
                      </Button>
                      <div className="relative">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-11 w-11 rounded-2xl"
                          onClick={() => setShowContactsMore((value) => !value)}
                          aria-label="Mais opções"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                        {showContactsMore && (
                          <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-64 rounded-2xl border bg-popover p-2 shadow-2xl shadow-black/30">
                            <button
                              type="button"
                              className="w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-primary/10"
                              onClick={() => {
                                const next = new Set(selectedIds);
                                visibleContacts
                                  .filter((contact) => !contact.segments.includes("unsubscribed"))
                                  .slice(0, overview?.config.maxSelectedRecipients || 25)
                                  .forEach((contact) => next.add(contact.id));
                                setSelectedIds(next);
                                setShowContactsMore(false);
                              }}
                            >
                              Selecionar todos os resultados
                            </button>
                            <button
                              type="button"
                              className="w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-primary/10"
                              onClick={() => {
                                setSearch("");
                                setSearchDraft("");
                                setOriginFilter("all");
                                setSegmentColumnFilter("all");
                                setNewsletterFilter("all");
                                setShowContactsMore(false);
                              }}
                            >
                              Limpar filtros
                            </button>
                          </div>
                        )}
                      </div>

                      <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                        {contactRangeStart}-{contactRangeEnd} de {visibleContacts.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={contactsPage <= 1}
                          onClick={() => setContactsPage((page) => Math.max(1, page - 1))}
                          aria-label="Página anterior"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={contactsPage >= totalContactPages}
                          onClick={() => setContactsPage((page) => Math.min(totalContactPages, page + 1))}
                          aria-label="Próxima página"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </form>
                  )}

                  {showContactsFilters && selectedContacts.length === 0 && (
                    <div className="mt-3 grid gap-2 rounded-2xl border border-primary/10 bg-background/35 p-3 text-sm md:grid-cols-3 xl:grid-cols-6">
                      <select
                        value={segment}
                        onChange={(event) => setSegment(event.target.value as Segment)}
                        className="h-10 rounded-xl border border-border bg-background px-3"
                        aria-label="Filtrar por plano"
                      >
                        <option value="all">Plano: todos</option>
                        <option value="standard">Plano: Padrão</option>
                        <option value="premium">Plano: Premium</option>
                      </select>
                      <select
                        value={newsletterFilter}
                        onChange={(event) => setNewsletterFilter(event.target.value as NewsletterFilter)}
                        className="h-10 rounded-xl border border-border bg-background px-3"
                        aria-label="Filtrar por newsletter"
                      >
                        {newsletterFilterOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={originFilter}
                        onChange={(event) => setOriginFilter(event.target.value as OriginFilter)}
                        className="h-10 rounded-xl border border-border bg-background px-3"
                        aria-label="Filtrar por origem"
                      >
                        {originFilterOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            Origem: {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={segmentColumnFilter}
                        onChange={(event) => setSegmentColumnFilter(event.target.value as Segment)}
                        className="h-10 rounded-xl border border-border bg-background px-3"
                        aria-label="Filtrar por segmentos"
                      >
                        {segmentFilterOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            Segmento: {option.label}
                          </option>
                        ))}
                      </select>
                      <button type="button" className="h-10 rounded-xl border border-dashed border-border px-3 text-left text-muted-foreground" onClick={() => toast.info("Filtro por data de cadastro será conectado com calendário.")}>
                        Data de cadastro
                      </button>
                      <button type="button" className="h-10 rounded-xl border border-dashed border-border px-3 text-left text-muted-foreground" onClick={() => toast.info("Filtro por última atividade será conectado ao histórico.")}>
                        Última atividade
                      </button>
                      <button type="button" className="h-10 rounded-xl border border-dashed border-border px-3 text-left text-muted-foreground md:col-span-3 xl:col-span-2" onClick={() => toast.info("Situação do endereço será conectada aos eventos de entrega.")}>
                        Situação do e-mail
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-[44px_minmax(260px,1.4fr)_150px_110px_150px_minmax(180px,1fr)_150px] items-center gap-3 border-b border-border/70 bg-background/50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground max-xl:hidden">
                  <Checkbox
                    checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                    onCheckedChange={toggleVisibleSelection}
                    disabled={selectableContacts.length === 0}
                    aria-label="Selecionar contatos visíveis"
                  />
                  <button type="button" onClick={cycleNameSort} className="inline-flex w-fit items-center gap-2 rounded-full px-2 py-1 transition hover:bg-primary/10 hover:text-primary">
                    Contato
                    <ArrowDownAZ className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={cycleOriginFilter} className="inline-flex w-fit items-center gap-2 rounded-full px-2 py-1 transition hover:bg-primary/10 hover:text-primary">
                    Origem
                    <Filter className="h-3.5 w-3.5" />
                  </button>
                  <span>Plano</span>
                  <button
                    type="button"
                    onClick={() => {
                      const currentIndex = newsletterFilterOptions.findIndex((option) => option.value === newsletterFilter);
                      const next = newsletterFilterOptions[(currentIndex + 1) % newsletterFilterOptions.length];
                      setNewsletterFilter(next.value);
                    }}
                    className="inline-flex w-fit items-center gap-2 rounded-full px-2 py-1 transition hover:bg-primary/10 hover:text-primary"
                  >
                    Newsletter
                    <Filter className="h-3.5 w-3.5" />
                    {newsletterFilter !== "all" && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">{activeNewsletterFilter?.label}</span>}
                  </button>
                  <button type="button" onClick={cycleSegmentColumnFilter} className="inline-flex w-fit items-center gap-2 rounded-full px-2 py-1 transition hover:bg-primary/10 hover:text-primary">
                    Segmentos
                    <Filter className="h-3.5 w-3.5" />
                  </button>
                  <span>Última atividade</span>
                </div>

                {loadingContacts ? (
                  <div className="flex items-center justify-center p-10 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Carregando contatos...
                  </div>
                ) : visibleContacts.length === 0 ? (
                  <div className="p-10 text-center text-sm text-muted-foreground">Nenhum contato encontrado.</div>
                ) : (
                  <div className="divide-y divide-border/70">
                    {paginatedContacts.map((contact) => {
                      const disabled = contact.segments.includes("unsubscribed");
                      const selected = selectedIds.has(contact.id);
                      const planLabel = getPlanLabel(contact);
                      const newsletterLabel = getNewsletterLabel(contact);
                      const additionalSegments = contact.segments.filter((item) => item !== "standard" && item !== "premium" && item !== "newsletter" && item !== "unsubscribed");

                      return (
                        <div
                          key={contact.id}
                          role="button"
                          tabIndex={disabled ? -1 : 0}
                          onClick={() => toggleContact(contact)}
                          onKeyDown={(event) => {
                            if (disabled) return;
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              toggleContact(contact);
                            }
                          }}
                          className={cn(
                            "group grid w-full grid-cols-[44px_minmax(0,1fr)] items-center gap-3 px-4 py-3 text-left transition duration-200 hover:bg-primary/5 xl:grid-cols-[44px_minmax(260px,1.4fr)_150px_110px_150px_minmax(180px,1fr)_150px]",
                            selected && "bg-primary/15 shadow-[inset_4px_0_0_rgba(217,54,208,0.75)]",
                            disabled && "cursor-not-allowed opacity-55",
                          )}
                        >
                          <Checkbox
                            checked={selected}
                            disabled={disabled}
                            onClick={(event) => event.stopPropagation()}
                            onCheckedChange={() => toggleContact(contact)}
                            aria-label={`Selecionar ${contact.email}`}
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate font-semibold">{contact.name || contact.email}</span>
                              {disabled && <Badge variant="destructive" className="text-[10px]">descadastrado</Badge>}
                            </div>
                            <p className="truncate text-sm text-muted-foreground">{contact.email}</p>
                            <p className="text-xs text-muted-foreground xl:hidden">
                              {getSourceLabel(contact.source)} · {planLabel} · {newsletterLabel} · {formatDate(contact.createdAt)}
                            </p>
                          </div>
                          <div className="hidden text-sm text-muted-foreground xl:block">{getSourceLabel(contact.source)}</div>
                          <div className="hidden xl:block">
                            <Badge variant="secondary" className={cn("text-[10px]", planLabel === "Premium" && "bg-primary/15 text-primary")}>
                              {planLabel}
                            </Badge>
                          </div>
                          <div className="hidden xl:block">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px]",
                                newsletterLabel === "Inscrito" && "bg-emerald-500/15 text-emerald-300",
                                newsletterLabel === "Descadastrado" && "bg-destructive/15 text-destructive",
                              )}
                            >
                              {newsletterLabel}
                            </Badge>
                          </div>
                          <div className="hidden flex-wrap gap-1 xl:flex">
                            {(additionalSegments.length ? additionalSegments : ["registered" as const]).slice(0, 3).map((item) => (
                              <Badge key={item} variant="secondary" className="text-[10px]">
                                {getSegmentLabel(item)}
                              </Badge>
                            ))}
                          </div>
                          <div className="hidden items-center justify-end xl:flex">
                            <span className="text-xs text-muted-foreground group-hover:hidden">{formatDate(contact.createdAt)}</span>
                            <div className="hidden items-center gap-1 group-hover:flex">
                              <Button
                                type="button"
                                size="icon"
                                className="h-8 w-8 bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedIds(new Set([contact.id]));
                                  toast.info("Contato preparado para envio.");
                                }}
                                aria-label="Enviar e-mail"
                              >
                                <Send className="h-3.5 w-3.5" />
                              </Button>
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={(event) => { event.stopPropagation(); toast.info("Detalhes do contato serão conectados na próxima etapa."); }} aria-label="Abrir detalhes">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={(event) => { event.stopPropagation(); toast.info("Edição de segmentos será conectada na próxima etapa."); }} aria-label="Editar segmentos">
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={(event) => { event.stopPropagation(); toast.info("Mais opções do contato."); }} aria-label="Mais opções">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-background/25 px-4 py-3 text-sm text-muted-foreground">
                  <span>Mostrando {contactRangeStart}-{contactRangeEnd} de {visibleContacts.length} resultado(s)</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={contactsPage <= 1} onClick={() => setContactsPage((page) => Math.max(1, page - 1))}>
                      Anterior
                    </Button>
                    <span className="text-xs">Página {contactsPage} de {totalContactPages}</span>
                    <Button variant="outline" size="sm" disabled={contactsPage >= totalContactPages} onClick={() => setContactsPage((page) => Math.min(totalContactPages, page + 1))}>
                      Próxima
                    </Button>
                  </div>
                </div>
              </div>

              <form onSubmit={submitSearch} className="hidden">
                <div className="hidden">
                  <p className="font-bold">Audiência</p>
                  <p className="text-sm text-muted-foreground">
                    {counts[segment] || 0} contato(s) neste segmento. {selectedContacts.length} selecionado(s).
                  </p>
                </div>
                <div className="relative w-11">
                  <button
                    type="button"
                    onClick={() => setShowTemplatePicker((value) => !value)}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/10 bg-background/70 p-0 outline-none transition hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40"
                    aria-label="Escolher modelo de envio"
                  >
                    <Layers3 className={cn("h-4 w-4 transition", showTemplatePicker && "text-primary")} />
                    <span className="hidden">
                      <span className="block truncate">{selectedTemplate?.name || "Modelo de envio"}</span>
                      <span className="block truncate text-[11px] font-medium text-muted-foreground">
                        {selectedTemplate?.subject || "Escolha um modelo salvo"}
                      </span>
                    </span>
                  </button>
                  {showTemplatePicker && (
                    <div className="absolute left-0 top-[calc(100%+8px)] z-40 w-80 overflow-hidden rounded-2xl border bg-popover p-1 shadow-2xl shadow-black/30">
                      {overview?.templates.length ? (
                        overview.templates.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => {
                              setSelectedTemplateId(template.id);
                              setShowTemplatePicker(false);
                            }}
                            className={cn(
                              "flex w-full flex-col rounded-xl px-3 py-2 text-left transition hover:bg-primary/10",
                              selectedTemplateId === template.id && "bg-primary/15 text-primary",
                            )}
                          >
                            <span className="truncate font-bold">{template.name}</span>
                            <span className="line-clamp-1 text-xs text-muted-foreground">{template.subject}</span>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum modelo salvo.</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="relative min-w-[260px] flex-1 lg:max-w-xl">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    placeholder="Buscar por e-mail ou nome"
                    className="h-11 rounded-2xl border-primary/10 bg-background/70 pl-9"
                  />
                </div>
                <Button type="submit" variant="outline" className="h-11 w-11 rounded-2xl p-0" aria-label="Buscar">
                  <Search className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    loadContacts();
                    loadOverview();
                  }}
                  className="ml-auto h-11 w-11 rounded-2xl p-0"
                  aria-label="Atualizar contatos"
                >
                  <RefreshCw className={cn("h-4 w-4", loadingContacts && "animate-spin")} />
                </Button>
                <Button
                  type="button"
                  onClick={() => sendEmail("test")}
                  disabled={sending || !configReady || !selectedTemplate}
                  variant="outline"
                  className="h-11 w-11 rounded-2xl border-emerald-500/30 p-0 text-emerald-300"
                  aria-label="Enviar teste"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Code2 className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  onClick={() => sendEmail("selected")}
                  disabled={sending || !configReady || !selectedTemplate || selectedContacts.length === 0}
                  className="relative h-11 w-11 rounded-2xl bg-emerald-500 p-0 text-emerald-950 hover:bg-emerald-400"
                  aria-label="Enviar selecionados"
                >
                  {selectedContacts.length > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-black text-primary-foreground shadow-lg shadow-primary/30">
                      {selectedContacts.length}
                    </span>
                  )}
                  <Send className="h-4 w-4" />
                </Button>
                <div className="hidden">
                  <Button type="button" variant="outline" onClick={toggleVisibleSelection} className="hidden" aria-label="Selecionar contatos visíveis">
                    <UserCheck className="h-4 w-4" />
                    Selecionar visíveis
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setSearch("");
                      setSearchDraft("");
                      clearSelection();
                    }}
                    className="h-11 w-11 rounded-2xl p-0 text-[0px]"
                    aria-label="Limpar seleção e busca"
                  >
                    <Trash2 className="h-4 w-4" />
                    Limpar
                  </Button>
                </div>
              </form>

              <div className="hidden">
                <div className="grid grid-cols-[44px_minmax(280px,1fr)_180px_260px] gap-3 border-b bg-background/60 px-5 py-4 text-xs font-bold uppercase tracking-wide text-muted-foreground max-lg:hidden">
                  <Checkbox
                    checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                    onCheckedChange={toggleVisibleSelection}
                    disabled={selectableContacts.length === 0}
                    aria-label="Selecionar contatos visíveis"
                  />
                  <button type="button" onClick={cycleNameSort} className="inline-flex w-fit items-center gap-2 rounded-full px-2 py-1 transition hover:bg-primary/10 hover:text-primary">
                    Contato
                    <ArrowDownAZ className="h-3.5 w-3.5" />
                    {nameSort !== "recent" && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">{nameSort.toUpperCase()}</span>}
                  </button>
                  <button type="button" onClick={cycleOriginFilter} className="inline-flex w-fit items-center gap-2 rounded-full px-2 py-1 transition hover:bg-primary/10 hover:text-primary">
                    Origem
                    <Filter className="h-3.5 w-3.5" />
                    {originFilter !== "all" && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">{activeOriginFilter?.label}</span>}
                  </button>
                  <button type="button" onClick={cycleSegmentColumnFilter} className="inline-flex w-fit items-center gap-2 rounded-full px-2 py-1 transition hover:bg-primary/10 hover:text-primary">
                    Segmentos
                    <Filter className="h-3.5 w-3.5" />
                    {segmentColumnFilter !== "all" && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">{activeSegmentColumnFilter?.label}</span>}
                  </button>
                </div>
                {loadingContacts ? (
                  <div className="flex items-center justify-center p-10 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Carregando contatos...
                  </div>
                ) : visibleContacts.length === 0 ? (
                  <div className="p-10 text-center text-sm text-muted-foreground">Nenhum contato encontrado.</div>
                ) : (
                  <div className="divide-y">
                    {visibleContacts.map((contact) => {
                      const disabled = contact.segments.includes("unsubscribed");
                      return (
                        <div
                          key={contact.id}
                          role="button"
                          tabIndex={disabled ? -1 : 0}
                          onClick={() => toggleContact(contact)}
                          onKeyDown={(event) => {
                            if (disabled) return;
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              toggleContact(contact);
                            }
                          }}
                          className={cn(
                            "grid w-full grid-cols-[44px_1fr] gap-3 px-5 py-4 text-left transition duration-200 hover:bg-primary/5 lg:grid-cols-[44px_minmax(280px,1fr)_180px_260px]",
                            selectedIds.has(contact.id) && "bg-primary/15 shadow-[inset_4px_0_0_rgba(217,54,208,0.75)]",
                            disabled && "cursor-not-allowed opacity-55",
                          )}
                        >
                          <Checkbox checked={selectedIds.has(contact.id)} disabled={disabled} className="mt-1" />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{contact.email}</span>
                            <span className="block text-xs text-muted-foreground">
                              {contact.name || "Sem nome"} · {formatDate(contact.createdAt)}
                            </span>
                          </span>
                          <span className="hidden text-sm text-muted-foreground lg:block">{getSourceLabel(contact.source)}</span>
                          <span className="hidden flex-wrap gap-1 lg:flex">
                            {contact.segments.map((item) => (
                              <Badge key={item} variant={item === "unsubscribed" ? "destructive" : "secondary"} className="text-[10px]">
                                {item}
                              </Badge>
                            ))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compose" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
            <Card className="overflow-visible border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card shadow-[0_24px_80px_rgba(217,54,208,0.08)]">
              <CardHeader className="border-b border-primary/10">
                <Badge className="mb-3 w-fit gap-2 border-primary/30 bg-primary/15 text-primary" variant="outline">
                  <Sparkles className="h-3.5 w-3.5" />
                  Editor visual
                </Badge>
                <CardTitle>{editingTemplateId ? "Editar modelo de e-mail" : "Criar modelo de e-mail"}</CardTitle>
                <CardDescription>Monte e salve modelos reutilizáveis. O envio acontece na aba Contatos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome interno</Label>
                    <Input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} />
                  </div>
                  <div className="relative space-y-2">
                    <Label>Tipo</Label>
                    <button
                      type="button"
                      onClick={() => setShowCampaignTypePicker((value) => !value)}
                      className="flex h-12 w-full items-center justify-between rounded-2xl border border-border bg-background/70 px-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      <span>
                        <span className="block font-semibold">{activeCampaignType.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">{activeCampaignType.description}</span>
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {showCampaignTypePicker && (
                      <div className="absolute right-0 top-full z-30 mt-2 w-full overflow-hidden rounded-2xl border border-primary/20 bg-popover shadow-2xl">
                        {campaignTypeOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setCampaignType(option.value);
                              setShowCampaignTypePicker(false);
                            }}
                            className={cn(
                              "w-full px-4 py-3 text-left transition hover:bg-primary/10",
                              campaignType === option.value && "bg-primary/15 text-primary",
                            )}
                          >
                            <span className="block font-semibold">{option.label}</span>
                            <span className="text-xs text-muted-foreground">{option.description}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Assunto</Label>
                  <Input value={subject} onChange={(event) => setSubject(event.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Prévia do e-mail</Label>
                  <Input value={preheader} onChange={(event) => setPreheader(event.target.value)} />
                </div>

                <div className="overflow-hidden rounded-3xl border border-primary/15 bg-background/45 shadow-inner">
                  <div className="flex flex-col gap-3 border-b border-primary/10 bg-muted/20 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-base font-bold">Estrutura do e-mail</p>
                      <p className="text-sm text-muted-foreground">Monte por blocos e deixe o HTML como modo avançado.</p>
                    </div>
                    <div className="flex w-fit rounded-2xl border border-border bg-background p-1">
                      <button
                        type="button"
                        onClick={() => setComposerMode("blocks")}
                        className={cn(
                          "rounded-xl px-4 py-2 text-sm font-semibold transition",
                          composerMode === "blocks" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:bg-muted",
                        )}
                      >
                        Blocos
                      </button>
                      <button
                        type="button"
                        onClick={() => setComposerMode("html")}
                        className={cn(
                          "rounded-xl px-4 py-2 text-sm font-semibold transition",
                          composerMode === "html" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:bg-muted",
                        )}
                      >
                        HTML
                      </button>
                    </div>
                  </div>

                  {composerMode === "blocks" ? (
                    <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
                      <div className="border-b border-primary/10 p-4 lg:border-b-0 lg:border-r">
                        <div className="mb-4 flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => addEmailBlock("heading")}>
                            <Heading1 className="mr-2 h-4 w-4" />
                            Título
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => addEmailBlock("paragraph")}>
                            <Rows3 className="mr-2 h-4 w-4" />
                            Texto
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => addEmailBlock("button")}>
                            <Send className="mr-2 h-4 w-4" />
                            Botão
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => addEmailBlock("eyebrow")}>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Etiqueta
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => addEmailBlock("divider")}>
                            <Rows3 className="mr-2 h-4 w-4" />
                            Divisor
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {emailBlocks.map((block, index) => (
                            <div
                              key={block.id}
                              role="button"
                              tabIndex={0}
                              draggable
                              onDragStart={() => setDraggingBlockId(block.id)}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => {
                                if (draggingBlockId) {
                                  reorderEmailBlocks(draggingBlockId, block.id);
                                }
                                setDraggingBlockId(null);
                              }}
                              onClick={() => setSelectedBlockId(block.id)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  setSelectedBlockId(block.id);
                                }
                              }}
                              className={cn(
                                "group grid cursor-pointer grid-cols-[28px_1fr_auto] items-center gap-3 rounded-2xl border bg-card/70 px-3 py-3 text-left transition hover:border-primary/30 hover:bg-primary/5",
                                selectedBlockId === block.id && "border-primary bg-primary/10 shadow-[inset_4px_0_0_rgba(217,54,208,0.7)]",
                              )}
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-[10px]">
                                    {getEmailBlockLabel(block)}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">#{index + 1}</span>
                                </div>
                                <p className="mt-1 truncate text-sm font-semibold">{getEmailBlockPreview(block)}</p>
                              </div>
                              <div className="flex items-center gap-1 opacity-70 transition group-hover:opacity-100">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  disabled={index === 0}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    moveEmailBlock(block.id, -1);
                                  }}
                                >
                                  <SortAsc className="h-4 w-4 rotate-180" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  disabled={index === emailBlocks.length - 1}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    moveEmailBlock(block.id, 1);
                                  }}
                                >
                                  <SortAsc className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    removeEmailBlock(block.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4 bg-muted/10 p-4">
                        <div>
                          <p className="font-bold">Editar bloco</p>
                          <p className="text-sm text-muted-foreground">Escolha alinhamento, estilo e conteúdo.</p>
                        </div>

                        {!selectedEmailBlock ? (
                          <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
                            Selecione um bloco da esquerda para editar.
                          </div>
                        ) : selectedEmailBlock.type === "divider" ? (
                          <div className="rounded-2xl border bg-card/70 p-4">
                            <p className="font-semibold">Divisor</p>
                            <p className="mt-1 text-sm text-muted-foreground">Uma linha discreta para separar seções do e-mail.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Alinhamento</Label>
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  type="button"
                                  variant={selectedEmailBlock.align === "left" ? "default" : "outline"}
                                  onClick={() => updateEmailBlock(selectedEmailBlock.id, { align: "left" })}
                                >
                                  <AlignLeft className="mr-2 h-4 w-4" />
                                  Lateral
                                </Button>
                                <Button
                                  type="button"
                                  variant={selectedEmailBlock.align === "center" ? "default" : "outline"}
                                  onClick={() => updateEmailBlock(selectedEmailBlock.id, { align: "center" })}
                                >
                                  <AlignCenter className="mr-2 h-4 w-4" />
                                  Central
                                </Button>
                              </div>
                            </div>

                            {selectedEmailBlock.type !== "button" && (
                              <div className="space-y-2">
                                <Label>Estilo do texto</Label>
                                <div className="grid grid-cols-3 gap-2">
                                  <Button
                                    type="button"
                                    variant={selectedEmailBlock.style?.bold ? "default" : "outline"}
                                    className={cn(
                                      "gap-2",
                                      selectedEmailBlock.style?.bold && "bg-fuchsia-500 text-black hover:bg-fuchsia-400",
                                    )}
                                    onClick={() => toggleEmailTextBlockStyle(selectedEmailBlock.id, "bold")}
                                  >
                                    <Bold className="h-4 w-4" />
                                    Negrito
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={selectedEmailBlock.style?.italic ? "default" : "outline"}
                                    className={cn(
                                      "gap-2",
                                      selectedEmailBlock.style?.italic && "bg-fuchsia-500 text-black hover:bg-fuchsia-400",
                                    )}
                                    onClick={() => toggleEmailTextBlockStyle(selectedEmailBlock.id, "italic")}
                                  >
                                    <Italic className="h-4 w-4" />
                                    Itálico
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={selectedEmailBlock.style?.href !== undefined ? "default" : "outline"}
                                    className={cn(
                                      "gap-2",
                                      selectedEmailBlock.style?.href !== undefined && "bg-fuchsia-500 text-black hover:bg-fuchsia-400",
                                    )}
                                    onClick={() => toggleEmailTextBlockLink(selectedEmailBlock.id)}
                                  >
                                    <Link2 className="h-4 w-4" />
                                    Link
                                  </Button>
                                </div>
                                {selectedEmailBlock.style?.href !== undefined && (
                                  <Input
                                    value={selectedEmailBlock.style.href ?? ""}
                                    onChange={(event) => updateEmailTextBlockStyle(selectedEmailBlock.id, { href: event.target.value })}
                                    placeholder="https://www.pqestudar.com.br"
                                    className="h-11 rounded-xl border-white/10 bg-black/20"
                                  />
                                )}
                              </div>
                            )}

                            {selectedEmailBlock.type === "heading" && (
                              <div className="space-y-2">
                                <Label>Formato</Label>
                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    type="button"
                                    variant={selectedEmailBlock.level === "h1" ? "default" : "outline"}
                                    onClick={() => updateEmailBlock(selectedEmailBlock.id, { level: "h1" })}
                                  >
                                    H1
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={selectedEmailBlock.level === "h2" ? "default" : "outline"}
                                    onClick={() => updateEmailBlock(selectedEmailBlock.id, { level: "h2" })}
                                  >
                                    H2
                                  </Button>
                                </div>
                              </div>
                            )}

                            {selectedEmailBlock.type === "button" ? (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <Label>Texto do botão</Label>
                                  <Input
                                    value={selectedEmailBlock.label}
                                    onChange={(event) => updateEmailBlock(selectedEmailBlock.id, { label: event.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Link</Label>
                                  <Input
                                    value={selectedEmailBlock.href}
                                    onChange={(event) => updateEmailBlock(selectedEmailBlock.id, { href: event.target.value })}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Label>Conteúdo</Label>
                                <Textarea
                                  value={selectedEmailBlock.content}
                                  onChange={(event) => updateEmailBlock(selectedEmailBlock.id, { content: event.target.value })}
                                  className="min-h-36"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4 p-4">
                      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">
                        Modo avançado. O HTML abaixo é o resultado dos blocos. Se editar manualmente, revise a prévia antes de salvar.
                      </div>
                      <div className="space-y-2">
                        <Label>HTML gerado</Label>
                        <Textarea value={htmlBody} onChange={(event) => setHtmlBody(event.target.value)} className="min-h-[340px] font-mono text-xs" />
                      </div>
                      <div className="space-y-2">
                        <Label>Versão texto simples</Label>
                        <Textarea value={textBody} onChange={(event) => setTextBody(event.target.value)} className="min-h-24" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 rounded-2xl border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold">{editingTemplateId ? "Modelo salvo aberto" : "Novo modelo"}</p>
                    <p className="text-sm text-muted-foreground">
                      Depois de salvar, selecione esse modelo na aba Contatos para enviar teste ou disparar para selecionados.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" onClick={createNewTemplate}>
                      Novo modelo
                    </Button>
                    <Button onClick={saveTemplate} disabled={savingTemplate}>
                      {savingTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Salvar modelo
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="xl:sticky xl:top-5 xl:self-start">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Pré-visualização</CardTitle>
                    <CardDescription>Veja uma aproximação de como o e-mail chegará.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowPreview((value) => !value)}>
                    <Eye className="mr-2 h-4 w-4" />
                    {showPreview ? "Ocultar" : "Ver"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Assunto</p>
                  <p className="font-bold">{subject || "Sem assunto"}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Prévia</p>
                  <p className="text-sm">{preheader || "Sem prévia"}</p>
                </div>
                {showPreview && (
                  <iframe title="Prévia do e-mail" srcDoc={htmlBody} className="h-[520px] w-full rounded-2xl border bg-white" />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Templates</CardTitle>
              <CardDescription>Modelos prontos para acelerar newsletter, curadoria e promoções.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingOverview ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Carregando templates...</div>
              ) : overview?.templates.length ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {overview.templates.map((template) => (
                    <Card key={template.id} className="flex min-h-[230px] flex-col bg-muted/20">
                      <CardHeader className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <Badge className="w-fit" variant="secondary">
                            {template.category}
                          </Badge>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Remover modelo"
                            onClick={() => deleteTemplate(template)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div>
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <CardDescription className="mt-1 line-clamp-2 text-sm">
                            {template.description || template.subject}
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="mt-auto grid gap-2 p-4 pt-0">
                        <Button
                          onClick={() => {
                            setSelectedTemplateId(template.id);
                            setActiveTab("contacts");
                          }}
                          size="sm"
                          className="w-full"
                        >
                          Selecionar para envio
                        </Button>
                        <Button onClick={() => applyTemplate(template)} variant="outline" size="sm" className="w-full">
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Editar modelo
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">Nenhum template cadastrado.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
              <CardDescription>Últimas campanhas, testes e disparos enviados pela central.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingOverview ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Carregando histórico...</div>
              ) : overview?.campaigns.length ? (
                <div className="overflow-hidden rounded-2xl border">
                  <div className="grid grid-cols-[1fr_130px_180px_110px_140px] gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-bold uppercase text-muted-foreground max-lg:hidden">
                    <span>Campanha</span>
                    <span>Status</span>
                    <span>Entrega</span>
                    <span>Falhas</span>
                    <span>Data</span>
                  </div>
                  <div className="divide-y">
                    {overview.campaigns.map((campaign) => {
                      const delivery = getCampaignDeliveryStatus(campaign);
                      const DeliveryIcon = delivery.icon;

                      return (
                        <div key={campaign.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_130px_180px_110px_140px]">
                          <div>
                            <p className="font-semibold">{campaign.name}</p>
                            <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                            {campaign.last_error && <p className="mt-1 text-xs text-destructive">{campaign.last_error}</p>}
                          </div>
                          <Badge className="w-fit" variant={campaign.status === "failed" ? "destructive" : "secondary"}>
                            {getStatusLabel(campaign.status)}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-full border", delivery.className)}>
                              <DeliveryIcon className={cn("h-4 w-4", delivery.iconClassName)} />
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">{delivery.label}</p>
                              <p className="text-xs text-muted-foreground">{delivery.detail}</p>
                            </div>
                          </div>
                          <span className="text-sm">{campaign.failed_count}</span>
                          <span className="text-sm text-muted-foreground">{formatDate(campaign.sent_at || campaign.created_at)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma campanha registrada ainda.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Resend</CardTitle>
              <CardDescription>Status do ambiente. Os segredos ficam no servidor e não são exibidos aqui.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 md:col-span-3">
                <div className="grid gap-3 md:grid-cols-[1fr_minmax(260px,420px)] md:items-end">
                  <div>
                    <p className="font-semibold">E-mail de teste</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Usado pelo botão de teste da aba Contatos. Assim a mesa de disparo fica limpa.
                    </p>
                  </div>
                  <Input
                    value={testEmail}
                    onChange={(event) => setTestEmail(event.target.value)}
                    type="email"
                    className="h-11 rounded-2xl bg-background/70"
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
              <div className="rounded-2xl border p-4">
                <div className="flex items-center gap-2">
                  {overview?.config.resendApiKey ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                  <p className="font-semibold">RESEND_API_KEY</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{overview?.config.resendApiKey ? "Configurada" : "Pendente"}</p>
              </div>
              <div className="rounded-2xl border p-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  <p className="font-semibold">Remetente</p>
                </div>
                <p className="mt-2 break-all text-sm text-muted-foreground">{overview?.config.fromEmail || "Configure RESEND_FROM_EMAIL"}</p>
              </div>
              <div className="rounded-2xl border p-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  <p className="font-semibold">Resposta</p>
                </div>
                <p className="mt-2 break-all text-sm text-muted-foreground">{overview?.config.replyTo || "Opcional: RESEND_REPLY_TO"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
