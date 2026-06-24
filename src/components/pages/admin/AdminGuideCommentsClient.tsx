"use client";

import { useEffect, useMemo, useState } from "react";
import type React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  MessageSquareText,
  Pin,
  PinOff,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type CommentStatus = "all" | "approved" | "pending" | "hidden" | "rejected" | "reported";

type GuideCommentRow = {
  id: string;
  guide_id: string;
  user_id: string;
  author_name: string | null;
  author_avatar: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  status: string;
  is_pinned: boolean;
  helpful_count: number;
  not_helpful_count: number;
  report_count: number;
  guides: {
    id: string;
    title: string;
    slug: string;
    is_published: boolean;
  } | null;
};

type GuideGroup = {
  guideId: string;
  title: string;
  slug: string;
  isPublished: boolean;
  comments: GuideCommentRow[];
  total: number;
  pending: number;
  reported: number;
  hidden: number;
  latestAt: string;
};

const statusLabels: Record<string, string> = {
  approved: "Aprovado",
  pending: "Pendente",
  hidden: "Oculto",
  rejected: "Rejeitado",
};

function statusBadgeClass(status: string) {
  if (status === "approved") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
  if (status === "pending") return "border-amber-500/20 bg-amber-500/10 text-amber-700";
  if (status === "hidden" || status === "rejected") {
    return "border-destructive/20 bg-destructive/10 text-destructive";
  }
  return "border-border bg-muted text-muted-foreground";
}

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function relativeDate(value: string) {
  return formatDistanceToNow(new Date(value), { addSuffix: true, locale: ptBR });
}

export default function AdminGuideCommentsClient() {
  const { toast } = useToast();
  const [comments, setComments] = useState<GuideCommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CommentStatus>("all");
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadComments = async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);

    const { data, error } = await supabase
      .from("guide_comments")
      .select(
        "id, guide_id, user_id, author_name, author_avatar, content, created_at, updated_at, status, is_pinned, helpful_count, not_helpful_count, report_count, guides(id, title, slug, is_published)",
      )
      .order("created_at", { ascending: false })
      .limit(1000);

    setLoading(false);
    setRefreshing(false);

    if (error) {
      toast({
        title: "Erro ao carregar comentários",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const rows = (data ?? []) as unknown as GuideCommentRow[];
    setComments(rows);

    if (!selectedGuideId && rows.length > 0) {
      setSelectedGuideId(rows[0].guide_id);
    }
  };

  useEffect(() => {
    void loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredComments = useMemo(() => {
    const term = query.trim().toLowerCase();

    return comments.filter((comment) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "reported" ? comment.report_count > 0 : comment.status === statusFilter);

      if (!matchesStatus) return false;
      if (!term) return true;

      return [
        comment.content,
        comment.author_name ?? "",
        comment.guides?.title ?? "",
        comment.guides?.slug ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [comments, query, statusFilter]);

  const guideGroups = useMemo<GuideGroup[]>(() => {
    const map = new Map<string, GuideGroup>();

    filteredComments.forEach((comment) => {
      const current = map.get(comment.guide_id);
      if (current) {
        current.comments.push(comment);
        current.total += 1;
        current.pending += comment.status === "pending" ? 1 : 0;
        current.reported += comment.report_count > 0 ? 1 : 0;
        current.hidden += comment.status === "hidden" || comment.status === "rejected" ? 1 : 0;
        if (new Date(comment.created_at) > new Date(current.latestAt)) {
          current.latestAt = comment.created_at;
        }
        return;
      }

      map.set(comment.guide_id, {
        guideId: comment.guide_id,
        title: comment.guides?.title ?? "Guia sem título",
        slug: comment.guides?.slug ?? "",
        isPublished: comment.guides?.is_published ?? false,
        comments: [comment],
        total: 1,
        pending: comment.status === "pending" ? 1 : 0,
        reported: comment.report_count > 0 ? 1 : 0,
        hidden: comment.status === "hidden" || comment.status === "rejected" ? 1 : 0,
        latestAt: comment.created_at,
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.pending !== b.pending) return b.pending - a.pending;
      if (a.reported !== b.reported) return b.reported - a.reported;
      return new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime();
    });
  }, [filteredComments]);

  useEffect(() => {
    if (guideGroups.length === 0) {
      setSelectedGuideId(null);
      return;
    }

    if (!selectedGuideId || !guideGroups.some((group) => group.guideId === selectedGuideId)) {
      setSelectedGuideId(guideGroups[0].guideId);
    }
  }, [guideGroups, selectedGuideId]);

  const selectedGroup = guideGroups.find((group) => group.guideId === selectedGuideId) ?? null;
  const totalComments = comments.length;
  const pendingCount = comments.filter((comment) => comment.status === "pending").length;
  const reportedCount = comments.filter((comment) => comment.report_count > 0).length;
  const activeGuideCount = new Set(comments.map((comment) => comment.guide_id)).size;

  const moderate = async (comment: GuideCommentRow, action: string) => {
    if (action === "delete") {
      const ok = window.confirm("Excluir este comentário definitivamente?");
      if (!ok) return;
    }

    setActingId(comment.id);
    const { error } = await supabase.rpc("admin_moderate_guide_comment", {
      p_id: comment.id,
      p_action: action,
    });
    setActingId(null);

    if (error) {
      toast({ title: "Erro na moderação", description: error.message, variant: "destructive" });
      return;
    }

    if (action === "delete") {
      setComments((prev) => prev.filter((item) => item.id !== comment.id));
    } else {
      setComments((prev) =>
        prev.map((item) =>
          item.id === comment.id
            ? {
                ...item,
                status:
                  action === "approve"
                    ? "approved"
                    : action === "hide"
                      ? "hidden"
                      : action === "reject"
                        ? "rejected"
                        : item.status,
                is_pinned: action === "pin" ? true : action === "unpin" ? false : item.is_pinned,
              }
            : item,
        ),
      );
    }

    toast({ title: "Comentário atualizado" });
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <MessageSquareText className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-[0.16em]">Guias</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            Comentários dos guias
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Acompanhe dúvidas e contribuições dos leitores agrupadas por guia, priorizando pendências e denúncias.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => loadComments("refresh")}
          disabled={refreshing}
          className="w-full justify-center lg:w-auto"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Comentários" value={totalComments} detail="total recebido" />
        <MetricCard label="Guias com conversa" value={activeGuideCount} detail="com comentários" />
        <MetricCard label="Pendentes" value={pendingCount} detail="aguardando ação" tone="warning" />
        <MetricCard label="Denúncias" value={reportedCount} detail="comentários sinalizados" tone="danger" />
      </section>

      <section className="rounded-[var(--admin-radius)] border border-border/60 bg-card p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por guia, autor, slug ou conteúdo do comentário..."
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as CommentStatus)}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="reported">Denunciados</SelectItem>
              <SelectItem value="approved">Aprovados</SelectItem>
              <SelectItem value="hidden">Ocultos</SelectItem>
              <SelectItem value="rejected">Rejeitados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <Skeleton className="h-[560px] rounded-[var(--admin-radius)]" />
          <Skeleton className="h-[560px] rounded-[var(--admin-radius)]" />
        </div>
      ) : guideGroups.length === 0 ? (
        <section className="rounded-[var(--admin-radius)] border border-dashed border-border bg-card p-10 text-center">
          <MessageSquareText className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Nenhum comentário encontrado</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quando os leitores comentarem nos guias, eles aparecerão agrupados aqui.
          </p>
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <section className="rounded-[var(--admin-radius)] border border-border/60 bg-card p-3 shadow-sm">
            <div className="mb-2 px-2 py-1">
              <h2 className="text-sm font-semibold">Guias</h2>
              <p className="text-xs text-muted-foreground">Ordenados por pendências e atividade recente.</p>
            </div>

            <div className="space-y-2">
              {guideGroups.map((group) => {
                const active = group.guideId === selectedGuideId;
                return (
                  <button
                    key={group.guideId}
                    type="button"
                    onClick={() => setSelectedGuideId(group.guideId)}
                    className={cn(
                      "w-full rounded-xl border p-3 text-left transition-colors",
                      active
                        ? "border-primary/35 bg-primary/10"
                        : "border-border/60 bg-background/60 hover:border-primary/25 hover:bg-muted/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{group.title}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {group.slug ? `/guias/${group.slug}` : "sem slug"}
                        </p>
                      </div>
                      <span className="rounded-full bg-background px-2 py-0.5 text-xs font-semibold text-foreground shadow-sm">
                        {group.total}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {group.pending > 0 && <TinyPill tone="warning">{group.pending} pend.</TinyPill>}
                      {group.reported > 0 && <TinyPill tone="danger">{group.reported} denún.</TinyPill>}
                      {group.hidden > 0 && <TinyPill>{group.hidden} ocultos</TinyPill>}
                      <TinyPill>{relativeDate(group.latestAt)}</TinyPill>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[var(--admin-radius)] border border-border/60 bg-card shadow-sm">
            {selectedGroup && (
              <>
                <div className="flex flex-col gap-3 border-b border-border/60 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-semibold">{selectedGroup.title}</h2>
                      <Badge variant="outline" className="text-xs">
                        {selectedGroup.isPublished ? "Publicado" : "Rascunho"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedGroup.total} comentário(s), {selectedGroup.pending} pendente(s), {selectedGroup.reported} denúncia(s)
                    </p>
                  </div>

                  {selectedGroup.slug && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/guias/${selectedGroup.slug}`} target="_blank">
                        Abrir guia
                      </Link>
                    </Button>
                  )}
                </div>

                <div className="divide-y divide-border/60">
                  {selectedGroup.comments.map((comment) => (
                    <article key={comment.id} className="p-4">
                      <div className="flex gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          {comment.author_avatar && (
                            <AvatarImage src={comment.author_avatar} alt={comment.author_name ?? ""} />
                          )}
                          <AvatarFallback>{getInitials(comment.author_name)}</AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm">{comment.author_name || "Usuário"}</span>
                            <span className="text-xs text-muted-foreground">{relativeDate(comment.created_at)}</span>
                            <Badge variant="outline" className={cn("text-[11px]", statusBadgeClass(comment.status))}>
                              {statusLabels[comment.status] ?? comment.status}
                            </Badge>
                            {comment.is_pinned && (
                              <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary text-[11px]">
                                Fixado
                              </Badge>
                            )}
                            {comment.report_count > 0 && (
                              <Badge variant="outline" className="border-destructive/20 bg-destructive/10 text-destructive text-[11px]">
                                {comment.report_count} denúncia(s)
                              </Badge>
                            )}
                          </div>

                          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
                            {comment.content}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{comment.helpful_count} útil</span>
                            <span>{comment.not_helpful_count} não útil</span>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {comment.status !== "approved" && (
                              <ActionButton
                                disabled={actingId === comment.id}
                                onClick={() => moderate(comment, "approve")}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Aprovar
                              </ActionButton>
                            )}
                            {comment.status !== "hidden" && (
                              <ActionButton
                                disabled={actingId === comment.id}
                                onClick={() => moderate(comment, "hide")}
                              >
                                <EyeOff className="h-3.5 w-3.5" />
                                Ocultar
                              </ActionButton>
                            )}
                            <ActionButton
                              disabled={actingId === comment.id}
                              onClick={() => moderate(comment, comment.is_pinned ? "unpin" : "pin")}
                            >
                              {comment.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                              {comment.is_pinned ? "Desafixar" : "Fixar"}
                            </ActionButton>
                            <ActionButton
                              danger
                              disabled={actingId === comment.id}
                              onClick={() => moderate(comment, "delete")}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Excluir
                            </ActionButton>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: number;
  detail: string;
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <div className="rounded-[var(--admin-radius)] border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        {tone === "warning" && <AlertTriangle className="h-4 w-4 text-amber-600" />}
        {tone === "danger" && <AlertTriangle className="h-4 w-4 text-destructive" />}
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function TinyPill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tone === "default" && "border-border bg-background text-muted-foreground",
        tone === "warning" && "border-amber-500/20 bg-amber-500/10 text-amber-700",
        tone === "danger" && "border-destructive/20 bg-destructive/10 text-destructive",
      )}
    >
      {children}
    </span>
  );
}

function ActionButton({
  children,
  danger,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        danger
          ? "border-destructive/25 text-destructive hover:bg-destructive/10"
          : "border-border bg-background text-foreground hover:bg-muted",
      )}
      {...props}
    >
      {children}
    </button>
  );
}
