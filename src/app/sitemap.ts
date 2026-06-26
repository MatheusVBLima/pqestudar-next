import type { MetadataRoute } from "next";
import { getActiveProducts } from "@/lib/data/products";
import { getPublishedOportunidades } from "@/lib/data/oportunidades";
import { getPublishedGuides } from "@/lib/data/guides";
import { getPublishedCurations } from "@/lib/data/curations";
import { getPublicTools } from "@/lib/data/tools";
import { slugifyProductTitle } from "@/lib/product-slug";
import { absoluteSiteUrl } from "@/lib/site";

function url(path: string): string {
  return absoluteSiteUrl(path);
}

const STATIC_INDEXABLE: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }> = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/concursos", changeFrequency: "daily", priority: 0.9 },
  { path: "/ferramentas", changeFrequency: "weekly", priority: 0.9 },
  { path: "/exclusivos", changeFrequency: "weekly", priority: 0.8 },
  { path: "/guias", changeFrequency: "weekly", priority: 0.9 },
  { path: "/explorar-cursos", changeFrequency: "weekly", priority: 0.7 },
  { path: "/votacoes", changeFrequency: "weekly", priority: 0.6 },
  { path: "/sobre-pqestudar", changeFrequency: "monthly", priority: 0.5 },
  { path: "/mapa-dos-beneficios", changeFrequency: "monthly", priority: 0.6 },
  { path: "/ranking-comunidade", changeFrequency: "weekly", priority: 0.4 },
  { path: "/termos", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacidade", changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const [oportunidades, guides, curations, products, toolsPage] = await Promise.all([
    getPublishedOportunidades().catch(() => []),
    getPublishedGuides().catch(() => []),
    getPublishedCurations().catch(() => []),
    getActiveProducts().catch(() => []),
    getPublicTools(1, 1000, []).catch(() => ({ tools: [] as Array<unknown> })),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_INDEXABLE.map((entry) => ({
    url: url(entry.path),
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));

  const concursoEntries: MetadataRoute.Sitemap = (oportunidades as Array<{ slug?: string; updated_at?: string }>).
    filter((o) => Boolean(o.slug)).
    map((o) => ({
      url: url(`/concursos/${o.slug}`),
      lastModified: o.updated_at ? new Date(o.updated_at) : now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  const guideEntries: MetadataRoute.Sitemap = (guides as Array<{ slug?: string; updated_at?: string }>).
    filter((g) => Boolean(g.slug)).
    map((g) => ({
      url: url(`/guias/${g.slug}`),
      lastModified: g.updated_at ? new Date(g.updated_at) : now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  const curationEntries: MetadataRoute.Sitemap = curations.map((c) => ({
    url: url(`/curadoria/${c.slug}`),
    lastModified: c.updated_at ? new Date(c.updated_at) : now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const productEntries: MetadataRoute.Sitemap = (products as Array<{ title: string; updated_at?: string }>).
    map((p) => ({
      url: url(`/exclusivos/${slugifyProductTitle(p.title)}`),
      lastModified: p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  const toolsList = (toolsPage as { tools?: Array<{ slug?: string; updated_at?: string }> }).tools ?? [];
  const toolEntries: MetadataRoute.Sitemap = toolsList
    .filter((t) => Boolean(t.slug))
    .map((t) => ({
      url: url(`/ferramentas/${t.slug}`),
      lastModified: t.updated_at ? new Date(t.updated_at) : now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  return [
    ...staticEntries,
    ...concursoEntries,
    ...guideEntries,
    ...curationEntries,
    ...productEntries,
    ...toolEntries,
  ];
}
