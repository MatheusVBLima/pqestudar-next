"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Ban,
  Flag,
  HelpCircle,
  LogIn,
  MoreVertical,
  Pin,
  PinOff,
  Send,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
  Timer,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guideId: string;
  guideTitle: string;
}

interface Question {
  id: string;
  user_id: string;
  author_name: string | null;
  author_avatar: string | null;
  content: string;
  created_at: string;
  status: string;
  is_pinned: boolean;
  helpful_count: number;
  not_helpful_count: number;
  report_count: number;
  my_reaction?: "helpful" | "not_helpful" | "report" | null;
}

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "ofensa", label: "Ofensa" },
  { value: "desinformacao", label: "Desinformação" },
  { value: "fora_de_contexto", label: "Fora de contexto" },
];

const URL_REGEX = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|br|net|org|io|co|me|app|xyz|info|gov|edu)\b)/i;

export function GuideCommentsDrawer({ open, onOpenChange, guideId, guideTitle }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const { toast } = useToast();
  const [items, setItems] = useState<Question[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reportTarget, setReportTarget] = useState<Question | null>(null);
  const [reportReason, setReportReason] = useState<string>("spam");

  // Mobile/tablet: pin body to prevent layout shift / scroll jump on iOS when Sheet opens
  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;
    if (window.innerWidth >= 1024) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);

      let admin = false;
      if (user) {
        const { data } = await supabase.rpc("is_admin");
        admin = !!data;
      }
      if (!cancelled) setIsAdmin(admin);

      const { data } = await supabase
        .from("guide_comments")
        .select(
          "id, user_id, author_name, author_avatar, content, created_at, status, is_pinned, helpful_count, not_helpful_count, report_count",
        )
        .eq("guide_id", guideId)
        .limit(300);

      const mine: Record<string, "helpful" | "not_helpful" | "report"> = {};
      if (user && data && data.length > 0) {
        const ids = data.map((d) => d.id);
        const { data: r } = await supabase
          .from("guide_comment_reactions")
          .select("comment_id, reaction")
          .in("comment_id", ids)
          .eq("user_id", user.id);
        (r ?? []).forEach((row) => {
          mine[row.comment_id] = row.reaction as "helpful" | "not_helpful" | "report";
        });
      }

      if (!cancelled) {
        setItems(
          (data ?? []).map((d) => ({
            ...d,
            my_reaction: mine[d.id] ?? null,
          })) as Question[],
        );
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, guideId, user?.id, user]);

  const visibleItems = useMemo(() => {
    const list = items.filter(
      (q) => q.status === "approved" || (user && q.user_id === user.id) || isAdmin,
    );
    return list.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      const sa = a.helpful_count - a.not_helpful_count;
      const sb = b.helpful_count - b.not_helpful_count;
      if (sa !== sb) return sb - sa;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [items, isAdmin, user]);

  const goLogin = () => {
    router.push(`/login?from=${encodeURIComponent(pathname)}`);
  };

  const submit = async () => {
    if (!user) return;
    const trimmed = content.trim();
    if (trimmed.length < 20) {
      toast({
        title: "Mensagem muito curta",
        description: "Escreva uma dúvida com pelo menos 20 caracteres.",
        variant: "destructive",
      });
      return;
    }
    if (!isAdmin && URL_REGEX.test(trimmed)) {
      toast({
        title: "Links não são permitidos",
        description: "Não é possível publicar links nas Dúvidas dos leitores.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("submit_guide_comment", {
      p_guide_id: guideId,
      p_content: trimmed,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    const res = data as { ok?: boolean; message?: string; status?: string; id?: string } | null;
    if (!res?.ok) {
      toast({
        title: "Não foi possível publicar",
        description: res?.message ?? "Verifique o conteúdo e tente novamente.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Dúvida enviada", description: res.message });
    setContent("");
    if (res.status === "approved" || res.status === "pending") {
      const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
      const author_name =
        meta.full_name || meta.name || meta.user_name || user.email?.split("@")[0] || "Usuário";
      const author_avatar = meta.avatar_url || meta.picture || null;
      setItems((prev) => [
        {
          id: res.id!,
          user_id: user.id,
          author_name,
          author_avatar,
          content: trimmed,
          created_at: new Date().toISOString(),
          status: res.status!,
          is_pinned: false,
          helpful_count: 0,
          not_helpful_count: 0,
          report_count: 0,
          my_reaction: null,
        },
        ...prev,
      ]);
    }
  };

  const react = async (
    q: Question,
    reaction: "helpful" | "not_helpful" | "report",
    reason?: string,
  ) => {
    if (!user) {
      goLogin();
      return;
    }
    const { error } = await supabase.rpc("react_guide_comment", {
      p_comment_id: q.id,
      p_reaction: reaction,
      p_reason: reason ?? null,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    const { data: c } = await supabase
      .from("guide_comments")
      .select("helpful_count, not_helpful_count, report_count, status")
      .eq("id", q.id)
      .maybeSingle();
    setItems((prev) =>
      prev.map((it) =>
        it.id === q.id
          ? {
              ...it,
              helpful_count: c?.helpful_count ?? it.helpful_count,
              not_helpful_count: c?.not_helpful_count ?? it.not_helpful_count,
              report_count: c?.report_count ?? it.report_count,
              status: c?.status ?? it.status,
              my_reaction:
                it.my_reaction === reaction && reaction !== "report" ? null : reaction,
            }
          : it,
      ),
    );
    if (reaction === "report") {
      toast({ title: "Denúncia registrada", description: "Obrigado pelo aviso." });
    }
  };

  const moderate = async (id: string, action: string) => {
    const { error } = await supabase.rpc("admin_moderate_guide_comment", {
      p_id: id,
      p_action: action,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    if (action === "delete") {
      setItems((prev) => prev.filter((it) => it.id !== id));
    } else {
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                status:
                  action === "approve"
                    ? "approved"
                    : action === "reject"
                      ? "rejected"
                      : action === "hide"
                        ? "hidden"
                        : it.status,
                is_pinned: action === "pin" ? true : action === "unpin" ? false : it.is_pinned,
              }
            : it,
        ),
      );
    }
  };

  const removeOwn = async (id: string) => {
    const { error } = await supabase.from("guide_comments").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const userAction = async (
    target: Question,
    action: "warn" | "suspend" | "unsuspend" | "ban" | "unban",
    days?: number,
  ) => {
    if (action === "ban") {
      const ok = window.confirm(
        `Banir ${target.author_name || "este usuário"} do recurso "Dúvidas dos leitores"?\n\nEle continuará podendo usar o site, mas não poderá mais enviar dúvidas.`,
      );
      if (!ok) return;
    }
    const { error } = await supabase.rpc("admin_user_moderation_action", {
      p_target_user_id: target.user_id,
      p_action: action,
      p_reason: null,
      p_days: days ?? null,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    const labels: Record<string, string> = {
      warn: "Advertência registrada",
      suspend: `Usuário suspenso por ${days ?? 7} dia(s)`,
      unsuspend: "Suspensão removida",
      ban: "Usuário banido das Dúvidas dos leitores",
      unban: "Banimento removido",
    };
    toast({ title: labels[action] });
  };

  const title =
    visibleItems.length === 0
      ? "Dúvidas dos leitores"
      : `Dúvidas dos leitores (${visibleItems.length})`;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 gap-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle className="flex items-center gap-2 text-left">
              <HelpCircle className="h-5 w-5" /> {title}
            </SheetTitle>
            <p className="text-xs text-muted-foreground text-left line-clamp-1">{guideTitle}</p>
          </SheetHeader>

          <div className="px-6 py-4 border-b">
            {user ? (
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Envie apenas dúvidas ou contribuições relacionadas ao tema do guia. Não publique
                  links, spam, ofensas ou conteúdo fora de contexto.
                </p>
                <Textarea
                  placeholder="Qual a sua dúvida sobre este guia?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={3}
                  maxLength={800}
                  className="resize-none"
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">{content.length}/800</span>
                  <Button
                    size="sm"
                    onClick={submit}
                    disabled={submitting || content.trim().length < 20}
                    className="rounded-full"
                  >
                    <Send className="h-4 w-4" />
                    {submitting ? "Enviando..." : "Enviar dúvida"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.2rem] border bg-muted/30 p-4 text-center space-y-3">
                <p className="text-sm">
                  Você precisa estar logado para enviar uma dúvida ou interagir.
                </p>
                <Button size="sm" className="rounded-full" onClick={goLogin}>
                  <LogIn className="h-4 w-4" /> Entrar
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : visibleItems.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                Nenhuma dúvida ainda. Seja o primeiro a perguntar!
              </div>
            ) : (
              visibleItems.map((q) => {
                const isOwn = user?.id === q.user_id;
                return (
                  <div key={q.id} className="flex gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      {q.author_avatar && (
                        <AvatarImage src={q.author_avatar} alt={q.author_name || ""} />
                      )}
                      <AvatarFallback>
                        {(q.author_name || "?").slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">
                          {q.author_name || "Usuário"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {format(new Date(q.created_at), "d MMM, HH:mm", { locale: ptBR })}
                        </span>
                        {q.is_pinned && (
                          <span className="text-[10px] uppercase tracking-wide bg-primary/10 text-primary rounded-full px-2 py-0.5 inline-flex items-center gap-1">
                            <Pin className="h-3 w-3" /> Fixada
                          </span>
                        )}
                        {q.status === "pending" && (
                          <span className="text-[10px] uppercase tracking-wide bg-amber-500/10 text-amber-600 rounded-full px-2 py-0.5">
                            Em moderação
                          </span>
                        )}
                        {(q.status === "hidden" || q.status === "rejected") && isAdmin && (
                          <span className="text-[10px] uppercase tracking-wide bg-destructive/10 text-destructive rounded-full px-2 py-0.5">
                            {q.status === "hidden" ? "Oculta" : "Rejeitada"}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words mt-0.5">
                        {q.content}
                      </p>

                      <div className="mt-2 flex items-center gap-1 flex-wrap">
                        <button
                          onClick={() => react(q, "helpful")}
                          className={`text-xs inline-flex items-center gap-1 rounded-full border px-2 py-1 transition-colors ${
                            q.my_reaction === "helpful"
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "hover:bg-muted"
                          }`}
                          aria-label="Foi útil"
                        >
                          <ThumbsUp className="h-3.5 w-3.5" /> Foi útil
                          {q.helpful_count > 0 && (
                            <span className="ml-1 tabular-nums">{q.helpful_count}</span>
                          )}
                        </button>
                        <button
                          onClick={() => react(q, "not_helpful")}
                          className={`text-xs inline-flex items-center gap-1 rounded-full border px-2 py-1 transition-colors ${
                            q.my_reaction === "not_helpful"
                              ? "bg-destructive/10 border-destructive/30 text-destructive"
                              : "hover:bg-muted"
                          }`}
                          aria-label="Não foi útil"
                        >
                          <ThumbsDown className="h-3.5 w-3.5" /> Não foi útil
                          {q.not_helpful_count > 0 && (
                            <span className="ml-1 tabular-nums">{q.not_helpful_count}</span>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            if (!user) {
                              goLogin();
                              return;
                            }
                            setReportTarget(q);
                            setReportReason("spam");
                          }}
                          className="text-xs inline-flex items-center gap-1 rounded-full border px-2 py-1 hover:bg-muted text-muted-foreground"
                          aria-label="Denunciar"
                        >
                          <Flag className="h-3.5 w-3.5" /> Denunciar
                        </button>

                        {isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="text-xs inline-flex items-center gap-1 rounded-full border px-2 py-1 hover:bg-muted ml-auto"
                                aria-label="Ações de moderação"
                              >
                                <MoreVertical className="h-3.5 w-3.5" /> Moderar
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel>Conteúdo</DropdownMenuLabel>
                              {q.status !== "approved" && (
                                <DropdownMenuItem onClick={() => moderate(q.id, "approve")}>
                                  <ThumbsUp className="h-4 w-4" /> Aprovar
                                </DropdownMenuItem>
                              )}
                              {q.status !== "hidden" && (
                                <DropdownMenuItem onClick={() => moderate(q.id, "hide")}>
                                  <ThumbsDown className="h-4 w-4" /> Ocultar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => moderate(q.id, q.is_pinned ? "unpin" : "pin")}
                              >
                                {q.is_pinned ? (
                                  <>
                                    <PinOff className="h-4 w-4" /> Desafixar
                                  </>
                                ) : (
                                  <>
                                    <Pin className="h-4 w-4" /> Fixar no topo
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => moderate(q.id, "delete")}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" /> Excluir dúvida
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Usuário</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => userAction(q, "warn")}>
                                <ShieldAlert className="h-4 w-4" /> Advertir usuário
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => userAction(q, "suspend", 7)}>
                                <Timer className="h-4 w-4" /> Suspender 7 dias
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => userAction(q, "suspend", 30)}>
                                <Timer className="h-4 w-4" /> Suspender 30 dias
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => userAction(q, "unsuspend")}>
                                <Timer className="h-4 w-4" /> Remover suspensão
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => userAction(q, "ban")}
                                className="text-destructive focus:text-destructive"
                              >
                                <Ban className="h-4 w-4" /> Banir das Dúvidas
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => userAction(q, "unban")}>
                                <Ban className="h-4 w-4" /> Remover banimento
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {isOwn && !isAdmin && (
                          <button
                            onClick={() => removeOwn(q.id)}
                            className="text-xs inline-flex items-center gap-1 rounded-full border px-2 py-1 hover:bg-muted text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Excluir
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!reportTarget} onOpenChange={(o) => !o && setReportTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Denunciar dúvida</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Qual o motivo da denúncia?</p>
            <div className="grid gap-2">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.value}
                  className="flex items-center gap-2 text-sm cursor-pointer rounded-md border px-3 py-2 hover:bg-muted"
                >
                  <input
                    type="radio"
                    name="report_reason"
                    value={r.value}
                    checked={reportReason === r.value}
                    onChange={() => setReportReason(r.value)}
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportTarget(null)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (reportTarget) {
                  await react(reportTarget, "report", reportReason);
                  setReportTarget(null);
                }
              }}
            >
              Enviar denúncia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
