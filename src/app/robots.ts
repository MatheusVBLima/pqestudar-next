import type { MetadataRoute } from "next";
import { absoluteSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/premium",
          "/premium/",
          "/meu-perfil",
          "/meus-materiais",
          "/salvos",
          "/ferramentas/salvos",
          "/noticias",
          "/noticia/",
          "/curso/",
          "/bonus/",
          "/breve",
          "/kit",
          "/assine",
          "/faq",
          "/mapa-dos-beneficios/",
          "/acesso-kit-partida-8h3z",
          "/curadoria-conteudo-ia-k4f9",
          "/acervo-video-prod-b7g1",
          "/metodos-automacao-w2p5",
          "/recursos-alta-performance-z9x0",
          "/api/",
        ],
      },
    ],
    sitemap: absoluteSiteUrl("/sitemap.xml"),
  };
}
