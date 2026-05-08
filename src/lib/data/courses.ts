import "server-only";
import { unstable_cache } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const COURSES_TAG = "courses";

async function fetchActiveCourses() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("active_courses")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export function getActiveCourses() {
  return unstable_cache(
    () => fetchActiveCourses(),
    ["active-courses"],
    { tags: [COURSES_TAG], revalidate: 600 },
  )();
}
