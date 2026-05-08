import "server-only";
import { unstable_cache } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export interface LegalDocument {
  id: string;
  route: string;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LegalSection {
  id: string;
  document_id: string;
  title: string;
  content: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const LEGAL_TAG = "legal";

export function legalRouteTag(route: string): string {
  return `legal:${route}`;
}

async function fetchLegalPage(route: string): Promise<{
  document: LegalDocument | null;
  sections: LegalSection[];
}> {
  const supabase = createServerSupabaseClient();

  const { data: doc } = await supabase
    .from("legal_documents")
    .select("*")
    .eq("route", route)
    .maybeSingle();

  if (!doc) {
    return { document: null, sections: [] };
  }

  const { data: sections } = await supabase
    .from("legal_sections")
    .select("*")
    .eq("document_id", doc.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return {
    document: doc as LegalDocument,
    sections: (sections ?? []) as LegalSection[],
  };
}

export function getLegalPage(route: string) {
  return unstable_cache(
    () => fetchLegalPage(route),
    ["legal-page", route],
    { tags: [LEGAL_TAG, legalRouteTag(route)], revalidate: 3600 },
  )();
}
