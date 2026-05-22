"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, Briefcase, Gift, Bookmark, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { usePageSettings } from "@/hooks/usePageSettings";
import { usePremiumSavedItems } from "@/hooks/usePremiumSavedItems";
import { usePremiumLastViewed } from "@/hooks/usePremiumLastViewed";
import { renderHighlightedTitle } from "@/lib/highlight-title";
import { ContinueCard } from "@/components/premium/ContinueCard";
import { PremiumRail } from "@/components/premium/PremiumRail";
import { CourseRailCard } from "@/components/premium/cards/CourseRailCard";
import { JobRailCard } from "@/components/premium/cards/JobRailCard";
import { BenefitRailCard } from "@/components/premium/cards/BenefitRailCard";
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
  { title: "Cursos", icon: BookOpen, href: "/premium/cursos", color: "text-blue-500" },
  { title: "Vagas", icon: Briefcase, href: "/premium/vagas", color: "text-green-500" },
  { title: "Benefícios", icon: Gift, href: "/premium/beneficios", color: "text-purple-500" },
  { title: "Salvos", icon: Bookmark, href: "/premium/salvos", color: "text-orange-500" },
];

export default function PremiumHomeNext() {
  const { subscription, getPlanName, getRemainingDays, isActive } = useSubscription();
  const ps = usePageSettings("/premium");
  const { lastViewed, recordView } = usePremiumLastViewed();
  const { isSaved, toggleSave, isToggling } = usePremiumSavedItems();
  const { isManagementMode } = useManagementMode();
  const { togglePublish, remove } = usePremiumItemAdminActions();

  const [courses, setCourses] = useState<PremiumItem[]>([]);
  const [jobs, setJobs] = useState<PremiumItem[]>([]);
  const [benefits, setBenefits] = useState<PremiumItem[]>([]);
  const [loading, setLoading] = useState({ courses: true, jobs: true, benefits: true });
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
    const setter = isPremiumBenefit(item.tags) ? setBenefits : item.item_type === "course" ? setCourses : setJobs;
    setter((prev) => {
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
    const baseSelect = "id, title, slug, description_short, logo_url, external_url, tags, item_type, status";
    (async () => {
      let q = supabase
        .from("premium_items")
        .select(baseSelect)
        .eq("item_type", "course")
        .order("sort_order", { ascending: true })
        .limit(10);
      if (!isManagementMode) q = q.eq("status", "published");
      const { data } = await q;
      setCourses(((data ?? []) as PremiumItem[]).filter((item) => !isPremiumBenefit(item.tags)));
      setLoading((s) => ({ ...s, courses: false }));
    })();

    (async () => {
      let q = supabase
        .from("premium_items")
        .select(baseSelect)
        .eq("item_type", "job")
        .order("sort_order", { ascending: true })
        .limit(10);
      if (!isManagementMode) q = q.eq("status", "published");
      const { data } = await q;
      setJobs((data ?? []) as PremiumItem[]);
      setLoading((s) => ({ ...s, jobs: false }));
    })();

    (async () => {
      let q = supabase
        .from("premium_items")
        .select(baseSelect)
        .eq("item_type", "course")
        .contains("tags", [PREMIUM_BENEFIT_TAG])
        .order("sort_order", { ascending: true })
        .limit(10);
      if (!isManagementMode) q = q.eq("status", "published");
      const { data } = await q;
      setBenefits((data ?? []) as PremiumItem[]);
      setLoading((s) => ({ ...s, benefits: false }));
    })();
  }, [isManagementMode]);

  const handleTogglePublish = async (item: PremiumItem, kind: "course" | "job") => {
    const newStatus = await togglePublish({ id: item.id, title: item.title, status: item.status });
    if (!newStatus) return;
    const setter = kind === "course" ? setCourses : setJobs;
    setter((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i)));
  };
  const handleDelete = async (item: PremiumItem, kind: "course" | "job") => {
    const ok = await remove({ id: item.id, title: item.title });
    if (!ok) return;
    const setter = kind === "course" ? setCourses : setJobs;
    setter((prev) => prev.filter((i) => i.id !== item.id));
  };
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
    <>
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-background border-b overflow-hidden px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.12),transparent_55%)]" />
        <div className="w-full max-w-[1440px] mx-auto py-12 md:py-16 relative">
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8 lg:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-5 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                {renderHighlightedTitle(ps.headerTitle ?? "Premium")}
              </h1>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                {ps.headerDescription}
              </p>
              {isActive() && subscription && (
                <div className="flex flex-wrap items-center gap-3 mt-5">
                  <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">
                    Plano {getPlanName()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {getRemainingDays()} dias restantes
                  </span>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <ContinueCard item={lastViewed} />
            </motion.div>
          </div>
        </div>
      </section>

      <main className="w-full max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 space-y-10 md:space-y-12">
        <ManagementToolbar
          createLabel="Novo item premium"
          onCreate={openCreate}
          hint="Edite, despublique ou exclua os destaques. Para reordenar, use /premium/cursos ou /premium/vagas."
        />

        <section aria-label="Acessos rápidos">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickAccess.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 p-4 rounded-[1.2rem] border border-border bg-card shadow-card hover:shadow-lg hover:border-primary/40 transition-all"
              >
                <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${item.color}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{item.title}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        </section>

        <PremiumRail
          title="Cursos gratuitos em destaque"
          subtitle="Seleção de cursos curados pela nossa equipe"
          viewMoreHref="/premium/cursos"
          isLoading={loading.courses}
          isEmpty={!loading.courses && courses.length === 0}
        >
          {courses.map((c) => (
            <ManageableCard
              key={c.id}
              id={c.id}
              onEdit={() => openEdit(c.id)}
              viewHref={`/premium/cursos/${c.slug}`}
              isPublished={c.status === "published"}
              onTogglePublish={() => handleTogglePublish(c, "course")}
              onDelete={() => handleDelete(c, "course")}
            >
              <CourseRailCard
                id={c.id}
                title={c.title}
                slug={c.slug}
                description={c.description_short}
                externalUrl={c.external_url}
                tags={c.tags ?? []}
                isSaved={isSaved(c.id)}
                isToggling={isToggling(c.id)}
                onToggleSave={() => toggleSave(c.id, { title: c.title, slug: c.slug })}
                onOpen={() =>
                  recordView({
                    type: "course",
                    id: c.id,
                    title: c.title,
                    slug: c.slug,
                    externalUrl: c.external_url ?? undefined,
                  })
                }
              />
            </ManageableCard>
          ))}
        </PremiumRail>

        <PremiumRail
          title="Vagas em destaque"
          subtitle="Oportunidades selecionadas para assinantes"
          viewMoreHref="/premium/vagas"
          isLoading={loading.jobs}
          isEmpty={!loading.jobs && jobs.length === 0}
        >
          {jobs.map((j) => (
            <ManageableCard
              key={j.id}
              id={j.id}
              onEdit={() => openEdit(j.id)}
              viewHref={`/premium/vagas/${j.slug}`}
              isPublished={j.status === "published"}
              onTogglePublish={() => handleTogglePublish(j, "job")}
              onDelete={() => handleDelete(j, "job")}
            >
              <JobRailCard
                id={j.id}
                title={j.title}
                slug={j.slug}
                description={j.description_short}
                externalUrl={j.external_url}
                tags={j.tags ?? []}
                isSaved={isSaved(j.id)}
                isToggling={isToggling(j.id)}
                onToggleSave={() => toggleSave(j.id, { title: j.title, slug: j.slug })}
                onOpen={() =>
                  recordView({
                    type: "job",
                    id: j.id,
                    title: j.title,
                    slug: j.slug,
                    externalUrl: j.external_url ?? undefined,
                  })
                }
              />
            </ManageableCard>
          ))}
        </PremiumRail>

        <PremiumRail
          title="Benefícios em destaque"
          subtitle="Vantagens selecionadas para assinantes"
          viewMoreHref="/premium/beneficios"
          isLoading={loading.benefits}
          isEmpty={!loading.benefits && benefits.length === 0}
        >
          {benefits.map((b) => (
            <ManageableCard
              key={b.id}
              id={b.id}
              onEdit={() => openEdit(b.id)}
              viewHref={`/premium/beneficios/${b.slug}`}
              isPublished={b.status === "published"}
              onTogglePublish={() => handleToggleBenefitPublish(b)}
              onDelete={() => handleBenefitDelete(b)}
            >
              <BenefitRailCard
                id={b.id}
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
      </main>

      <PremiumItemEditDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        itemId={editingId}
        onSaved={handleSaved}
      />
    </>
  );
}
