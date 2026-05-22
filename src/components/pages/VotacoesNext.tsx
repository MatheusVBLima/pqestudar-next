"use client";

import { Suspense, lazy, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHero } from "@/components/layout/PageHero";
import { ThumbsUp, CheckCircle, History, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureRequests, FeatureRequest } from "@/hooks/useFeatureRequests";
import { toast } from "@/hooks/use-toast";
import { usePageSettings } from "@/hooks/usePageSettings";
import { useManagementMode } from "@/hooks/useManagementMode";
import { ManagementToolbar } from "@/components/management/ManagementToolbar";
import { getErrorMessage } from "@/lib/error-message";

const VotacoesManagementGrid = lazy(() => import("@/legacy-pages/votacoes/VotacoesManagementGrid"));

const UI_RADIUS = "rounded-[1.2rem]";

function PublicFeatureCard({
  feature,
  rank,
  onVote,
  onUnvote,
}: {
  feature: FeatureRequest;
  rank: number;
  onVote: (id: string) => void;
  onUnvote: (id: string) => void;
}) {
  const { user } = useAuth();

  return (
    <div className="relative group h-full">
      <div
        className={`border border-border bg-card flex flex-col h-full overflow-hidden transition-all duration-300 shadow-card hover:-translate-y-1 ${UI_RADIUS}`}
      >
        <div className="flex flex-col flex-1 p-4 gap-3">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center justify-center border border-border bg-muted text-foreground text-xs font-bold px-2.5 py-1 ${UI_RADIUS}`}
            >
              #{rank}
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground text-xs font-semibold">
              <ThumbsUp className="h-3.5 w-3.5" />
              {feature.votes_count}
            </span>
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-foreground mb-1.5">
              {feature.title}
            </h3>
            {feature.description && (
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                {feature.description}
              </p>
            )}
          </div>

          <div className="mt-auto">
            {user ? (
              <Button
                variant={feature.user_voted ? "default" : "outline"}
                size="sm"
                onClick={() => (feature.user_voted ? onUnvote(feature.id) : onVote(feature.id))}
                className={`w-full gap-2 text-sm ${UI_RADIUS}`}
              >
                <ThumbsUp className={`h-3.5 w-3.5 ${feature.user_voted ? "fill-current" : ""}`} />
                {feature.user_voted ? "Votado ✓" : "Votar"}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast({ title: "Faça login para votar" })}
                className={`w-full gap-2 text-sm ${UI_RADIUS}`}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                Votar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VotacoesNext() {
  const ps = usePageSettings("/votacoes");
  const { isAdmin, loading: loadingRoles } = useUserRoles();
  const { isManagementMode } = useManagementMode();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FeatureRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeatureRequest | null>(null);
  const [completeTarget, setCompleteTarget] = useState<FeatureRequest | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const effectiveAdmin = isAdmin;
  const isManagement = isManagementMode && effectiveAdmin;
  const includeHidden = isManagement;

  const {
    features,
    loading,
    vote,
    unvote,
    create,
    update,
    toggleVisible,
    remove,
    complete,
    reorder,
  } = useFeatureRequests(includeHidden);

  const openFeatures = features
    .filter((f) => f.status === "open")
    .sort(
      (a, b) =>
        b.votes_count - a.votes_count ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  const completedFeatures = features.filter((f) => f.status === "completed");

  const openModal = (feature?: FeatureRequest) => {
    if (feature) {
      setEditing(feature);
      setFormTitle(feature.title);
      setFormDesc(feature.description || "");
    } else {
      setEditing(null);
      setFormTitle("");
      setFormDesc("");
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) return;
    setIsSaving(true);
    try {
      const payload = { title: formTitle, description: formDesc };
      if (editing) {
        update({ id: editing.id, ...payload });
      } else {
        create(payload);
      }
      setModalOpen(false);
    } catch (err: unknown) {
      toast({ title: "Erro ao salvar", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageHero
        title={ps.headerTitle}
        description={ps.headerDescription}
        isLoading={ps.isLoading}
      />

      <div className="w-full max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-16 pb-8">
        {effectiveAdmin && !loadingRoles && isManagement && (
          <>
          <ManagementToolbar
            createLabel="Nova votação"
            onCreate={() => openModal()}
            hint="Edite, exclua ou acompanhe as votações de novos lançamentos."
          />
          <div className="flex gap-2 mb-4">
            
                <Button
                  size="sm"
                  variant={showHistory ? "default" : "outline"}
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <History className="h-4 w-4 mr-1" /> Histórico
                </Button>
            
          </div>
          </>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className={`h-40 ${UI_RADIUS}`} />
            ))}
          </div>
        ) : openFeatures.length === 0 ? (
          <div className="text-center py-16">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum lançamento em votação no momento.</p>
          </div>
        ) : isManagement ? (
          <Suspense
            fallback={
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {[1, 2, 3, 4].map((key) => (
                  <Skeleton key={key} className={`h-40 ${UI_RADIUS}`} />
                ))}
              </div>
            }
          >
            <VotacoesManagementGrid
              features={openFeatures}
              onReorder={reorder}
              onVote={vote}
              onUnvote={unvote}
              onEdit={openModal}
              onToggle={(feature) =>
                toggleVisible({ id: feature.id, is_visible: feature.is_visible })
              }
              onDelete={setDeleteTarget}
              onComplete={setCompleteTarget}
            />
          </Suspense>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
            <AnimatePresence mode="popLayout">
              {openFeatures.map((feature, index) => (
                <motion.div
                  key={feature.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="h-full"
                >
                  <PublicFeatureCard feature={feature} rank={index + 1} onVote={vote} onUnvote={unvote} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {isManagement && showHistory && completedFeatures.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Concluídos
            </h2>
            <div className="grid gap-3">
              {completedFeatures.map((f) => (
                <Card key={f.id} className="opacity-75">
                  <CardHeader className="py-3">
                    <CardTitle className="text-base line-through">{f.title}</CardTitle>
                    {f.completed_at && (
                      <p className="text-xs text-muted-foreground">
                        Concluído em {new Date(f.completed_at).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className={`sm:max-w-[480px] ${UI_RADIUS}`}>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Edite as informações do lançamento."
                : "Preencha as informações do novo lançamento para votação."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Título do lançamento"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descrição (opcional)"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formTitle.trim() || isSaving}>
              {isSaving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.title}&quot; será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) remove(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!completeTarget} onOpenChange={() => setCompleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como concluído?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{completeTarget?.title}&quot; será marcado como concluído e uma notificação será enviada a
              todos os usuários.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (completeTarget) complete(completeTarget.id);
                setCompleteTarget(null);
              }}
            >
              Concluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
