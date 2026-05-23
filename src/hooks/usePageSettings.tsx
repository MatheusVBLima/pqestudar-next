import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { revalidatePageSettingsAction } from "@/app/actions/revalidate";

declare global {
  interface Window {
    __PAGE_SETTINGS_READY__?: boolean;
  }
}

export interface PageSettings {
  id: string;
  route: string;
  title_tag: string;
  meta_description: string;
  header_title: string;
  header_description: string;
  created_at: string;
  updated_at: string;
}

type FallbackContent = Omit<PageSettings, "id" | "route" | "created_at" | "updated_at">;

const DEFAULT_FALLBACK: FallbackContent = {
  title_tag: "PqEstudar",
  meta_description: "Oportunidades educacionais e ferramentas úteis.",
  header_title: "PqEstudar",
  header_description: "Conteúdo organizado para você evoluir mais rápido.",
};

// Per-route fallbacks must match the live DB content exactly (text + accents
// + **highlight** markers) so the swap from fallback → DB value is visually
// identical and produces no flash. If admins edit page_settings via the
// admin UI, re-sync these values (query: SELECT route, title_tag,
// meta_description, header_title, header_description FROM page_settings).
const ROUTE_FALLBACKS: Record<string, FallbackContent> = {
  "/": {
    title_tag: "Curadoria e Tutoriais Práticos para Estudar | PqEstudar",
    meta_description:
      "Explore ferramentas, concursos e guias passo a passo para estudar melhor. Veja destaques, salve recursos e acompanhe atualizações.",
    header_title: "Aprenda, Organize e **Evolua** com as Ferramentas Certas",
    header_description:
      "O PqEstudar organiza ferramentas online, plataformas educacionais, concursos públicos e conteúdos práticos para você resolver problemas e crescer mais rápido!",
  },
  "/ferramentas": {
    title_tag: "Ferramentas e Plataformas Educacionais Gratuitas | PqEstudar",
    meta_description:
      "Plataformas educacionais e ferramentas gratuitas organizadas por categoria. Descubra recursos oficiais e confiáveis para estudar melhor e evoluir.",
    header_title: "Ferramentas e Plataformas Educacionais **Gratuitas**",
    header_description:
      "Recursos organizados para estudar melhor, ganhar produtividade e acessar plataformas confiáveis sem perder tempo.",
  },
  "/concursos": {
    title_tag: "Concursos Públicos Abertos e Previstos | PqEstudar",
    meta_description:
      "Concursos públicos abertos e previstos organizados por status. Acompanhe editais publicados, prazos e atualizações para não perder nenhuma oportunidade.",
    header_title: "Concursos Públicos **Abertos** e Previstos",
    header_description:
      "Lista organizada de concursos com edital publicado e previsões confirmadas. Acompanhe prazos, status e atualizações em um só lugar.",
  },
  "/votacoes": {
    title_tag: "Votação de Novas Funcionalidades | PqEstudar",
    meta_description:
      "Vote nas próximas funcionalidades do PqEstudar. Sugira melhorias, acompanhe o roadmap e participe das decisões da plataforma.",
    header_title: "Vote nas **Próximas** Funcionalidades",
    header_description:
      "Ajude a decidir o futuro da plataforma. Vote nas próximas atualizações e acompanhe o que está em desenvolvimento.",
  },
  "/salvos": {
    title_tag: "Itens Salvos | PqEstudar",
    meta_description:
      "Acesse todas as ferramentas, concursos e recursos que você salvou para acompanhar depois.",
    header_title: "Seus **Salvos** em Um Só Lugar",
    header_description:
      "Ferramentas e concursos que você marcou para acessar depois, sempre à mão.",
  },
  "/premium": {
    title_tag: "Premium | Oportunidades e Curadoria Exclusiva | PqEstudar",
    meta_description:
      "Acesse curadorias exclusivas, vagas selecionadas, cursos estratégicos e atualizações semanais para acelerar sua evolução profissional.",
    header_title: "Área **Premium** do PqEstudar",
    header_description:
      "Recursos selecionados, vagas exclusivas e atualizações constantes para quem quer evoluir com direção.",
  },
  "/premium/vagas": {
    title_tag: "Vagas Premium - PqEstudar",
    meta_description:
      "Curadoria exclusiva de vagas de emprego e estágio selecionadas para assinantes premium do PqEstudar.",
    header_title: "Vagas **Selecionadas** para Você Crescer",
    header_description:
      "Curadoria exclusiva de oportunidades de trabalho e estágio, filtradas para quem busca evoluir com clareza.",
  },
  "/premium/cursos": {
    title_tag: "Cursos Premium - PqEstudar",
    meta_description:
      "Curadoria de cursos gratuitos e premium escolhidos a dedo para acelerar o seu aprendizado.",
    header_title: "Cursos **Curados** para Acelerar Sua Evolução",
    header_description:
      "Uma seleção criteriosa de cursos gratuitos e pagos para você estudar o que realmente importa.",
  },
  "/premium/beneficios": {
    title_tag: "Benefícios Premium - PqEstudar",
    meta_description:
      "Acesse benefícios, vantagens, cupons e recursos selecionados para assinantes premium do PqEstudar.",
    header_title: "Benefícios **Premium** para Aproveitar Mais",
    header_description:
      "Cupons, acessos, vantagens e recursos selecionados para assinantes.",
  },
  "/premium/salvos": {
    title_tag: "Meus Salvos - PqEstudar Premium",
    meta_description:
      "Acesse rapidamente os cursos e vagas que você salvou na Área Premium do PqEstudar.",
    header_title: "Seus **Salvos** em Um Só Lugar",
    header_description: "Cursos e vagas que você marcou para acessar depois, sempre à mão.",
  },
  "/privacidade": {
    title_tag: "Política de Privacidade e LGPD | PqEstudar",
    meta_description:
      "Entenda como o PqEstudar coleta, usa e protege seus dados conforme a LGPD. Transparência, segurança e controle para você.",
    header_title: "Política de **Privacidade**",
    header_description:
      "Saiba quais dados coletamos, por que coletamos e como protegemos suas informações conforme a LGPD.",
  },
  "/termos": {
    title_tag: "Termos de Uso | PqEstudar",
    meta_description:
      "Termos de uso do PqEstudar. Conheça as regras, responsabilidades e condições para utilizar a plataforma e seus recursos.",
    header_title: "Termos de **Uso**",
    header_description:
      "Condições que regulam o uso dos serviços, recursos e conteúdos do PqEstudar.",
  },
  "/produtos": {
    title_tag: "Produtos Oficiais do PqEstudar | PqEstudar",
    meta_description:
      "Produtos digitais criados pelo PqEstudar para ajudar você a estudar melhor, aproveitar benefícios e crescer com estratégia.",
    header_title: "Guias e **Soluções** Criadas pelo PqEstudar",
    header_description:
      "Recursos digitais desenvolvidos para organizar oportunidades, economizar dinheiro e acelerar sua evolução pessoal e profissional.",
  },
  "/sobre-pqestudar": {
    title_tag: "Sobre o PqEstudar: O que é e Como funciona | PqEstudar",
    meta_description:
      "Conheça o PqEstudar, plataforma que reúne concursos, ferramentas, produtos e conteúdos práticos para ajudar você a encontrar oportunidades.",
    header_title:
      "O PqEstudar existe para facilitar o que deveria ser **simples**",
    header_description:
      "Reunimos ferramentas, oportunidades e conteúdos práticos para ajudar você a estudar melhor e decidir com mais clareza.",
  },
  "/guias": {
    title_tag: "Guias Práticos e Tutoriais para Estudar | PqEstudar",
    meta_description:
      "Explore guias práticos e tutoriais evergreen para estudar melhor, usar ferramentas, aproveitar oportunidades e resolver dúvidas passo a passo.",
    header_title: "Guias Práticos e **Tutoriais**",
    header_description:
      "Encontre conteúdos diretos ao ponto para entender processos, usar ferramentas e aproveitar melhor diferentes oportunidades.",
  },
};

function getFallback(route: string): FallbackContent {
  return ROUTE_FALLBACKS[route] ?? DEFAULT_FALLBACK;
}

const MANAGED_ROUTES = [
  "/",
  "/ferramentas",
  "/concursos",
  "/votacoes",
  "/salvos",
  "/premium",
  "/premium/vagas",
  "/premium/cursos",
  "/premium/beneficios",
  "/premium/salvos",
  "/privacidade",
  "/termos",
  "/produtos",
  "/sobre-pqestudar",
  "/guias",
] as const;

export type ManagedRoute = (typeof MANAGED_ROUTES)[number];

export function isManagedRoute(route: string): route is ManagedRoute {
  return MANAGED_ROUTES.includes(route as ManagedRoute);
}

export { MANAGED_ROUTES };

export async function fetchPageSettingsByRoute(route: string): Promise<PageSettings | null> {
  const { data, error } = await supabase
    .from("page_settings")
    .select("*")
    .eq("route", route)
    .maybeSingle();

  if (error) {
    console.error(`[PageSettings] Error loading settings for ${route}:`, error.message);
    return null;
  }

  return data as unknown as PageSettings | null;
}

// ─── Single route hook (for pages) ───
export function usePageSettings(route: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["page_settings", route],
    queryFn: () => fetchPageSettingsByRoute(route),
    staleTime: 5 * 60 * 1000,
  });

  const settings = data
    ? (data as PageSettings)
    : null;

  const isReady = !isLoading;
  const fallback = getFallback(route);

  // Signal for iframe-based audit engine to know page settings are loaded
  useEffect(() => {
    if (isReady) {
      window.__PAGE_SETTINGS_READY__ = true;
      window.dispatchEvent(new Event("page-settings-ready"));
    }
    return () => {
      window.__PAGE_SETTINGS_READY__ = false;
    };
  }, [isReady]);

  return {
    titleTag: settings?.title_tag ?? fallback.title_tag,
    metaDescription: settings?.meta_description ?? fallback.meta_description,
    headerTitle: settings?.header_title ?? fallback.header_title,
    headerDescription: settings?.header_description ?? fallback.header_description,
    isLoading: false,
    isReady,
    raw: settings,
  };
}

// ─── All routes hook (for admin) ───
export function useAllPageSettings() {
  const queryClient = useQueryClient();

  const { data: allSettings, isLoading } = useQuery({
    queryKey: ["page_settings", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_settings")
        .select("*")
        .order("route");

      if (error) {
        console.error("[PageSettings] Error loading all settings:", error.message);
        return [];
      }
      return (data ?? []) as unknown as PageSettings[];
    },
    staleTime: 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Pick<PageSettings, "route" | "title_tag" | "meta_description" | "header_title" | "header_description">) => {
      const { error } = await supabase
        .from("page_settings")
        .update({
          title_tag: updates.title_tag,
          meta_description: updates.meta_description,
          header_title: updates.header_title,
          header_description: updates.header_description,
        })
        .eq("route", updates.route);

      if (error) throw error;
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["page_settings"] });
      await revalidatePageSettingsAction(variables.route);
    },
  });

  return {
    allSettings: allSettings ?? [],
    isLoading,
    updateSettings: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
