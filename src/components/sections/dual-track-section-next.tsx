"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Eye,
  Globe,
  MapPin,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/* ─── Types ─── */

interface ToolPreview {
  id: string;
  name: string;
  description: string;
  url?: string;
  icon_url?: string;
  tags: string[];
}

interface ConcursoPreview {
  id: string;
  titulo: string;
  slug: string;
  categoria: string;
  situacao: string;
  abrangencia: string;
  data_publicacao: string;
  views_total: number;
}

interface GuidePreview {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  public_category: string;
  cover_image_url: string | null;
}

/* ─── Style maps ─── */

const SITUACAO_COLORS: Record<string, string> = {
  Previsto: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "Edital publicado": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Aberto: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Encerrado: "bg-muted text-muted-foreground border-muted",
};

/* ─── Data hooks ─── */

function useFeaturedTools() {
  return useQuery({
    queryKey: ["home-featured-tools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools_public")
        .select("id, name, description, url, icon_url, tags")
        .order("sort_order", { ascending: true })
        .limit(3);
      if (error) throw error;
      return (data || []) as ToolPreview[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useTopConcursos() {
  return useQuery({
    queryKey: ["home-top-concursos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("oportunidades")
        .select("id, titulo, slug, categoria, situacao, abrangencia, data_publicacao, views_total")
        .eq("publicado", true)
        .order("views_total", { ascending: false })
        .limit(3);
      if (error) throw error;
      return ((data || []) as unknown as ConcursoPreview[]).map((d) => ({
        ...d,
        views_total: d.views_total ?? 0,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useFeaturedGuides() {
  return useQuery({
    queryKey: ["home-featured-guides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guides")
        .select("id, title, slug, short_description, public_category, cover_image_url")
        .eq("is_published", true)
        .order("is_featured", { ascending: false })
        .order("sort_order", { ascending: true })
        .limit(3);
      if (error) throw error;
      return (data || []) as unknown as GuidePreview[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/* ─── Row items ─── */

function ToolRow({ tool }: { tool: ToolPreview }) {
  return (
    <a
      href={tool.url || "#"}
      target={tool.url ? "_blank" : undefined}
      rel="noopener noreferrer"
      className="flex items-center gap-3 py-3 px-1 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden border shrink-0">
        {tool.icon_url ? (
          <img
            src={tool.icon_url}
            alt={`Logo de ${tool.name}`}
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <Sparkles className="w-4 h-4 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{tool.name}</p>
        <p className="text-xs text-muted-foreground truncate">{tool.description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

function ConcursoRow({ item }: { item: ConcursoPreview }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(`/concursos/${item.slug}`)}
      className="flex items-center gap-3 py-3 px-1 rounded-lg hover:bg-muted/50 transition-colors group w-full text-left"
    >
      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
        {item.abrangencia === "Nacional" ? (
          <Globe className="w-4 h-4 text-primary" />
        ) : (
          <MapPin className="w-4 h-4 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{item.titulo}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 h-4 ${SITUACAO_COLORS[item.situacao] || ""}`}
          >
            {item.situacao}
          </Badge>
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Eye className="h-3 w-3" />
            {item.views_total.toLocaleString("pt-BR")}
          </span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

function GuideRow({ guide }: { guide: GuidePreview }) {
  return (
    <Link
      href={`/guias/${guide.slug}`}
      className="flex items-center gap-3 py-3 px-1 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden border shrink-0">
        {guide.cover_image_url ? (
          <img
            src={guide.cover_image_url}
            alt=""
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <BookOpen className="w-4 h-4 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{guide.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {guide.short_description || guide.public_category}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

/* ─── Skeletons ─── */

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 px-1">
      <Skeleton className="w-9 h-9 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  );
}

/* ─── Track card ─── */

function TrackCard({
  badge,
  title,
  description,
  ctaLabel,
  ctaTo,
  children,
  footerLabel,
  footerTo,
}: {
  badge: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaTo: string;
  children: React.ReactNode;
  footerLabel: string;
  footerTo: string;
}) {
  return (
    <Card className="flex flex-col h-full overflow-hidden rounded-[1.2rem]">
      <CardHeader className="pb-2">
        <Badge variant="secondary" className="w-fit text-xs mb-2">
          {badge}
        </Badge>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="pt-3">
          <Button variant="hero" size="sm" className="rounded-[1.2rem] gap-1" asChild>
            <Link href={ctaTo}>
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-0">
        <div className="divide-y divide-border flex-1">{children}</div>
        <Link
          href={footerTo}
          className="text-sm text-primary font-medium flex items-center gap-1 mt-4 hover:underline"
        >
          {footerLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}

/* ─── Main Section ─── */

const ease = [0.16, 1, 0.3, 1] as const;
const trackGridVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.05,
    },
  },
};
const trackCardVariants = {
  hidden: {
    opacity: 0,
    x: 92,
    scaleX: 0.82,
    scaleY: 0.96,
    rotate: 2,
    filter: "blur(3px)",
  },
  visible: {
    opacity: 1,
    x: 0,
    scaleX: 1,
    scaleY: 1,
    rotate: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.68,
      ease,
    },
  },
};

export function DualTrackSectionNext() {
  const toolsQuery = useFeaturedTools();
  const concursosQuery = useTopConcursos();
  const guidesQuery = useFeaturedGuides();

  return (
    <section className="py-16 md:py-24">
      <div className="w-full max-w-[1504px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header — same pattern as HomeProductsSection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10"
        >
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Por onde quer começar?
            </h2>
            <p className="text-muted-foreground mt-2 max-w-lg">
              Escolha uma trilha e veja os destaques de agora.
            </p>
          </div>
        </motion.div>

        {/* Track cards */}
        <motion.div
          variants={trackGridVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.28, margin: "0px 0px -12% 0px" }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch"
        >
          {/* Column A — Ferramentas */}
          <motion.div
            variants={trackCardVariants}
            className="h-full"
          >
            <TrackCard
              badge="Top 3 da semana"
              title="Ferramentas em destaque"
              description="Resolva problemas rápido"
              ctaLabel="Explorar Ferramentas"
              ctaTo="/ferramentas"
              footerLabel="Ver todas as ferramentas"
              footerTo="/ferramentas"
            >
              {toolsQuery.isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
              ) : toolsQuery.data && toolsQuery.data.length > 0 ? (
                toolsQuery.data.map((tool) => <ToolRow key={tool.id} tool={tool} />)
              ) : (
                <p className="text-muted-foreground text-sm py-6">
                  Em breve novos destaques.
                </p>
              )}
            </TrackCard>
          </motion.div>

          {/* Column B — Concursos */}
          <motion.div
            variants={trackCardVariants}
            className="h-full"
          >
            <TrackCard
              badge="Mais acessados"
              title="Concursos mais acessados"
              description="Acompanhe oportunidades com clareza"
              ctaLabel="Ver Concursos"
              ctaTo="/concursos"
              footerLabel="Ver todos os concursos"
              footerTo="/concursos"
            >
              {concursosQuery.isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
              ) : concursosQuery.data && concursosQuery.data.length > 0 ? (
                concursosQuery.data.map((item) => (
                  <ConcursoRow key={item.id} item={item} />
                ))
              ) : (
                <p className="text-muted-foreground text-sm py-6">
                  Sem concursos em destaque no momento.
                </p>
              )}
            </TrackCard>
          </motion.div>

          {/* Column C — Guias */}
          <motion.div
            variants={trackCardVariants}
            className="h-full"
          >
            <TrackCard
              badge="Guias práticos"
              title="Guias em destaque"
              description="Aprenda o próximo passo com clareza"
              ctaLabel="Explorar Guias"
              ctaTo="/guias"
              footerLabel="Ver todos os guias"
              footerTo="/guias"
            >
              {guidesQuery.isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
              ) : guidesQuery.data && guidesQuery.data.length > 0 ? (
                guidesQuery.data.map((guide) => (
                  <GuideRow key={guide.id} guide={guide} />
                ))
              ) : (
                <p className="text-muted-foreground text-sm py-6">
                  Em breve novos guias em destaque.
                </p>
              )}
            </TrackCard>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
