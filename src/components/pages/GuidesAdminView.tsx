"use client";

import { useMemo, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GuideModal } from "@/components/admin/GuideModal";
import { FeaturedGuideCard } from "@/components/guides/FeaturedGuideCard";
import { GuideListItem } from "@/components/guides/GuideListItem";
import { ManagementToolbar } from "@/components/management/ManagementToolbar";
import { Guide } from "@/hooks/useGuides";
import { useGuidesMutations } from "@/hooks/useGuidesMutations";
import type { TablesInsert } from "@/integrations/supabase/types";

interface GuidesAdminViewProps {
  guides: Guide[] | undefined;
  isLoading: boolean;
  filteredGuides: Guide[];
  forceToolbar?: boolean;
}

export default function GuidesAdminView({
  guides,
  isLoading,
  filteredGuides,
  forceToolbar = false,
}: GuidesAdminViewProps) {
  const [adminTab, setAdminTab] = useState<"published" | "drafts">("published");
  const [modalOpen, setModalOpen] = useState(false);
  const [editGuide, setEditGuide] = useState<Guide | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Guide | null>(null);
  const { createGuide, updateGuide, deleteGuide, togglePublished, toggleFeatured } = useGuidesMutations();

  const publishedCount = useMemo(() => guides?.filter((g) => g.is_published).length ?? 0, [guides]);
  const draftsCount = useMemo(() => guides?.filter((g) => !g.is_published).length ?? 0, [guides]);

  const tabGuides = useMemo(
    () =>
      filteredGuides.filter((g) =>
        adminTab === "published" ? g.is_published : !g.is_published
      ),
    [adminTab, filteredGuides],
  );

  const adminActions = {
    onEdit: (guide: Guide) => {
      setEditGuide(guide);
      setModalOpen(true);
    },
    onDelete: (guide: Guide) => setDeleteTarget(guide),
    onTogglePublished: (guide: Guide) =>
      togglePublished.mutate({ id: guide.id, is_published: !guide.is_published }),
    onToggleFeatured: (guide: Guide) =>
      toggleFeatured.mutate({ id: guide.id, is_featured: !guide.is_featured }),
  };

  const handleSave = async (data: Partial<Guide>) => {
    if (data.id) {
      await updateGuide.mutateAsync(data as Partial<Guide> & { id: string });
      return;
    }
    await createGuide.mutateAsync(data as TablesInsert<"guides">);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-64 rounded-[1.2rem]" />
          <Skeleton className="h-24 rounded-[1.2rem]" />
          <Skeleton className="h-24 rounded-[1.2rem]" />
        </div>
      );
    }

    const featuredGuide =
      adminTab === "published" ? tabGuides.find((g) => g.is_featured) ?? tabGuides[0] ?? null : null;
    const listGuides =
      adminTab === "published" && featuredGuide
        ? tabGuides.filter((g) => g.id !== featuredGuide.id)
        : tabGuides;

    return (
      <>
        {featuredGuide && (
          <FeaturedGuideCard guide={featuredGuide} showAdmin {...adminActions} />
        )}
        <div className="space-y-4">
          {listGuides.map((guide) => (
            <GuideListItem
              key={guide.id}
              guide={guide}
              showAdmin
              showFeaturedBadge={adminTab === "published"}
              {...adminActions}
            />
          ))}
        </div>
      </>
    );
  };

  return (
    <>
      <ManagementToolbar
        createLabel="Novo guia"
        onCreate={() => {
          setEditGuide(null);
          setModalOpen(true);
        }}
        hint="Edite, publique ou exclua guias. Use as abas para revisar publicados e rascunhos."
        forceVisible={forceToolbar}
      />

      <Tabs value={adminTab} onValueChange={(v) => setAdminTab(v as "published" | "drafts")}>
        <TabsList className="mb-6">
          <TabsTrigger value="published">Publicados ({publishedCount})</TabsTrigger>
          <TabsTrigger value="drafts">Rascunhos ({draftsCount})</TabsTrigger>
        </TabsList>
        <TabsContent value="published">{renderContent()}</TabsContent>
        <TabsContent value="drafts">{renderContent()}</TabsContent>
      </Tabs>

      <GuideModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditGuide(null);
        }}
        onSave={handleSave}
        guide={editGuide}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir guia</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir &quot;{deleteTarget?.title}&quot;? Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget) return;
                deleteGuide.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
