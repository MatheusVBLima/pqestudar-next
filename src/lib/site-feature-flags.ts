import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const PREMIUM_COURSES_PUBLIC_FLAG = "premium_courses_public_access";

export async function arePremiumCoursesPublic(): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("site_feature_flags")
    .select("enabled")
    .eq("key", PREMIUM_COURSES_PUBLIC_FLAG)
    .maybeSingle();

  if (error) {
    console.error("Erro ao consultar liberação pública dos cursos Premium:", error.message);
    return false;
  }

  return data?.enabled === true;
}

