"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Gift, Bookmark, ArrowRight, MapPinned, Trophy, ChartNoAxesColumnIncreasing, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { usePageSettings } from "@/hooks/usePageSettings";
import { usePremiumSavedItems } from "@/hooks/usePremiumSavedItems";
import { usePremiumLastViewed } from "@/hooks/usePremiumLastViewed";
import { renderHighlightedTitle } from "@/lib/highlight-title";
import { ContinueCard } from "@/components/premium/ContinueCard";
import { PremiumRail } from "@/components/premium/PremiumRail";
import { VisualBenefitCard } from "@/components/premium/cards/VisualBenefitCard";
import styles from "./PremiumHome.module.css";
import { useManagementMode } from "@/hooks/useManagementMode";
import { ManagementToolbar } from "@/components/management/ManagementToolbar";
import { ManageableCard } from "@/components/management/ManageableCard";
import { usePremiumItemAdminActions } from "@/hooks/usePremiumItemAdminActions";
import { PremiumItemEditDialog, type PremiumItemSaved } from "@/components/premium/PremiumItemEditDialog";
import { PREMIUM_BENEFIT_TAG, isPremiumBenefit } from "@/lib/premium-benefits";

interface PremiumItem {
  id: string;
  title: string;
  slug: string;
  description_short: string | null;
  logo_url: string | null;
  external_url: string | null;
  tags: string[] | null;
  item_type?: string;
  status?: string;
}

const quickAccess = [
  { title: "Benefícios", description: "Acesse todos os benefícios premium", icon: Gift, href: "/premium/beneficios" },
  { title: "Mapa", description: "Explore oportunidades no seu estado", icon: MapPinned, href: "/premium/mapa-beneficios" },
  { title: "Salvos", description: "Seus conteúdos favoritos", icon: Bookmark, href: "/premium/salvos" },
];

const recommendedRoutes = [
  { title: "Primeiros Passos", tag: "Para começar", description: "Conheça os benefícios e comece sua jornada.", art: "hero", href: "/premium/beneficios" },
  { title: "Rumo ao Emprego", tag: "Carreira", description: "Encontre apoios para seu futuro profissional.", art: "work", href: "/premium/beneficios?q=trabalho" },
  { title: "Do Plano à Ação", tag: "Empreendedorismo", description: "Descubra apoios para tirar suas ideias do papel.", art: "business", href: "/premium/beneficios?q=empreend" },
  { title: "Aprender Sempre", tag: "Estudos contínuos", description: "Explore oportunidades para seguir aprendendo.", art: "education", href: "/premium/beneficios?q=curso" },
  { title: "Mais Cidadania", tag: "Seus direitos", description: "Explore os benefícios disponíveis na sua região.", art: "culture", href: "/premium/mapa-beneficios" },
];

export default function PremiumHomeNext() {
  const { subscription, getPlanName, getRemainingDays, isActive } = useSubscription();
  const ps = usePageSettings("/premium");
  const { lastViewed, recordView } = usePremiumLastViewed();
  const { isSaved, toggleSave, isToggling } = usePremiumSavedItems();
  const { isManagementMode } = useManagementMode();
  const { togglePublish, remove } = usePremiumItemAdminActions();

  const [benefits, setBenefits] = useState<PremiumItem[]>([]);
  const [loading, setLoading] = useState({ benefits: true });
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setEditorOpen(true);
  };
  const openEdit = (id: string) => {
    setEditingId(id);
    setEditorOpen(true);
  };
  const handleSaved = (item: PremiumItemSaved) => {
    const mapped: PremiumItem = {
      id: item.id,
      title: item.title,
      slug: item.slug,
      description_short: item.description_short,
      logo_url: item.logo_url,
      external_url: item.external_url,
      tags: item.tags,
      item_type: item.item_type,
      status: item.status,
    };
    if (!isPremiumBenefit(item.tags)) return;
    setBenefits((prev) => {
      const idx = prev.findIndex((p) => p.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = mapped;
        return next;
      }
      return [mapped, ...prev];
    });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading({ benefits: true });
    setLoadError(false);
    const baseSelect = "id, title, slug, description_short, logo_url, external_url, tags, item_type, status";
    (async () => {
      let q = supabase
        .from("premium_items")
        .select(baseSelect)
        .eq("item_type", "course")
        .contains("tags", [PREMIUM_BENEFIT_TAG])
        .order("sort_order", { ascending: true })
        .limit(10);
      if (!isManagementMode) q = q.eq("status", "published");
      const { data, error } = await q;
      if (cancelled) return;
      setLoadError(Boolean(error));
      setBenefits((data ?? []) as PremiumItem[]);
      setLoading((s) => ({ ...s, benefits: false }));
    })().catch(() => {
      if (cancelled) return;
      setLoadError(true);
      setLoading({ benefits: false });
    });
    return () => { cancelled = true; };
  }, [isManagementMode, retry]);

  const handleToggleBenefitPublish = async (item: PremiumItem) => {
    const newStatus = await togglePublish({ id: item.id, title: item.title, status: item.status });
    if (!newStatus) return;
    setBenefits((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i)));
  };
  const handleBenefitDelete = async (item: PremiumItem) => {
    const ok = await remove({ id: item.id, title: item.title });
    if (!ok) return;
    setBenefits((prev) => prev.filter((i) => i.id !== item.id));
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroArt} aria-hidden="true">
          <Image src="/images/premium/hero.webp" alt="" fill sizes="(max-width: 767px) 100vw, 60vw" preload />
        </div>
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <h1>{renderHighlightedTitle(ps.headerTitle ?? "Premium")}</h1>
              <p>{ps.headerDescription}</p>
              <div className={styles.values}>
                <span><Trophy />Mais oportunidades</span>
                <span><ChartNoAxesColumnIncreasing />Desenvolva seu futuro</span>
                <span><Users />Conte com a gente</span>
              </div>
              {isActive() && subscription && (
                <p className="mt-3 text-xs text-muted-foreground">Plano {getPlanName()} &middot; {getRemainingDays()} dias restantes</p>
              )}
            </div>
            <div className={styles.welcome}>
              <ContinueCard item={lastViewed?.type === "course" || lastViewed?.type === "job" ? null : lastViewed} />
            </div>
          </div>
        </div>
      </section>
      <main className={`${styles.container} ${styles.content}`}>
        <ManagementToolbar
          createLabel="Novo benefício"
          onCreate={openCreate}
          hint="Edite, despublique ou exclua os benefícios em destaque."
        />

        <nav aria-label="Acessos premium" className={styles.quickGrid}>
          {quickAccess.map((item) => (
            <Link key={item.href} href={item.href} className={styles.quick} aria-label={item.title} title={item.title}>
              <div className={styles.quickIcon} aria-hidden="true"><item.icon size={27} /></div>
              <div className={styles.quickText}><strong>{item.title}</strong><p>{item.description}</p></div>
              <ArrowRight size={19} aria-hidden="true" />
            </Link>
          ))}
        </nav>

        <PremiumRail
          className={styles.rail}
          title="Benefícios em destaque"
          subtitle="Vantagens selecionadas para assinantes"
          viewMoreHref="/premium/beneficios"
          isLoading={loading.benefits}
          isEmpty={!loading.benefits && benefits.length === 0}
          emptyState={<div className="rounded-xl border border-border p-6 text-sm text-muted-foreground" role={loadError ? "alert" : "status"}>
            {loadError ? <>Não foi possível carregar os benefícios. <button type="button" className="text-primary underline" onClick={() => setRetry((value) => value + 1)}>Tentar novamente</button></> : "Novos benefícios aparecerão aqui assim que estiverem disponíveis."}
          </div>}
        >
          {benefits.map((b) => (
            <ManageableCard
              key={b.id}
              className="shrink-0"
              id={b.id}
              onEdit={() => openEdit(b.id)}
              viewHref={`/premium/beneficios/${b.slug}`}
              isPublished={b.status === "published"}
              onTogglePublish={() => handleToggleBenefitPublish(b)}
              onDelete={() => handleBenefitDelete(b)}
            >
              <VisualBenefitCard
                title={b.title}
                slug={b.slug}
                description={b.description_short}
                tags={b.tags ?? []}
                isSaved={isSaved(b.id)}
                isToggling={isToggling(b.id)}
                onToggleSave={() => toggleSave(b.id, { title: b.title, slug: b.slug })}
                onOpen={() =>
                  recordView({
                    type: "benefit",
                    id: b.id,
                    title: b.title,
                    slug: b.slug,
                    href: `/premium/beneficios/${b.slug}`,
                    externalUrl: b.external_url ?? undefined,
                  })
                }
              />
            </ManageableCard>
          ))}
        </PremiumRail>
        <PremiumRail className={styles.rail} title="Rotas recomendadas" subtitle="Trilhas para você evoluir ainda mais" viewMoreHref="/premium/beneficios">
          {recommendedRoutes.map((route) => (
            <Link key={route.title} href={route.href} className={styles.route}>
              <Image src={`/images/premium/${route.art}.webp`} alt="" fill sizes="(max-width: 767px) 82vw, 320px" />
              <span>{route.tag}</span><h3>{route.title}</h3><p>{route.description}</p><ArrowRight />
            </Link>
          ))}
        </PremiumRail>
      </main>

      <PremiumItemEditDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        itemId={editingId}
        defaultType="course"
        lockType
        hiddenTags={[PREMIUM_BENEFIT_TAG]}
        itemKindLabel="benefício"
        detailBasePath="/premium/beneficios"
        onSaved={handleSaved}
      />
    </div>
  );
}
