import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://pqestudar.com.br";

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
          "/login",
          "/meu-perfil",
          "/meus-materiais",
          "/ferramentas/salvos",
          "/noticias",
          "/noticia/",
          "/curso/",
          "/bonus/",
          "/breve",
          "/kit",
          "/assine",
          "/faq",
          "/configuracoes-cookies",
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
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
