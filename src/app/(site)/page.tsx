import type { Metadata } from "next";
import { dehydrate } from "@tanstack/react-query";
import IndexNext from "@/components/pages/IndexNext";
import { QueryHydration } from "@/components/providers/query-hydration";
import { createQueryClient } from "@/lib/query-client";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function generateMetadata(): Promise<Metadata> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("page_settings")
    .select("title_tag, meta_description")
    .eq("route", "/")
    .maybeSingle();

  return {
    title: data?.title_tag ?? "Curadoria e Tutoriais Praticos para Estudar | PqEstudar",
    description:
      data?.meta_description ??
      "Explore ferramentas, concursos e guias passo a passo para estudar melhor. Veja destaques, salve recursos e acompanhe atualizacoes.",
  };
}

export default async function HomePage() {
  const queryClient = createQueryClient();
  const supabase = createServerSupabaseClient();

  const [
    { data: pageSettings },
    { data: featuredTools },
    { data: topConcursos },
    { data: products },
    { data: usersCount, error: usersCountError },
    { count: toolsCount },
    { count: contestsCount },
  ] = await Promise.all([
    supabase.from("page_settings").select("*").eq("route", "/").maybeSingle(),
    supabase
      .from("tools_public")
      .select("id, name, description, url, icon_url, tags")
      .order("sort_order", { ascending: true })
      .limit(3),
    supabase
      .from("oportunidades")
      .select("id, titulo, slug, categoria, situacao, abrangencia, data_publicacao, views_total")
      .eq("publicado", true)
      .order("views_total", { ascending: false })
      .limit(3),
    supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase.rpc("public_users_count"),
    supabase.from("tools_public").select("*", { count: "exact", head: true }),
    supabase.from("oportunidades_public").select("*", { count: "exact", head: true }),
  ]);

  queryClient.setQueryData(["page_settings", "/"], pageSettings ?? null);
  queryClient.setQueryData(["home-featured-tools"], featuredTools ?? []);
  queryClient.setQueryData(
    ["home-top-concursos"],
    (topConcursos ?? []).map((item) => ({
      ...item,
      views_total: item.views_total ?? 0,
    })),
  );
  queryClient.setQueryData(["products-public"], products ?? []);
  queryClient.setQueryData(["metrics-users-count"], usersCountError ? null : (usersCount ?? null));
  queryClient.setQueryData(["metrics-tools-count"], toolsCount ?? null);
  queryClient.setQueryData(["metrics-contests-count"], contestsCount ?? null);

  return (
    <QueryHydration state={dehydrate(queryClient)}>
      <IndexNext />
    </QueryHydration>
  );
}
