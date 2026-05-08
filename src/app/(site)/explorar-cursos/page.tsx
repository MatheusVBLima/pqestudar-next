import type { Metadata } from "next";
import { dehydrate } from "@tanstack/react-query";
import ExploreCoursesNext from "@/components/pages/ExploreCoursesNext";
import { QueryHydration } from "@/components/providers/query-hydration";
import { createQueryClient } from "@/lib/query-client";
import { getActiveCourses } from "@/lib/data/courses";

export const metadata: Metadata = {
  title: "Explorar Cursos | PqEstudar",
  description: "Explore cursos selecionados de tecnologia, negócios, design e marketing.",
  alternates: { canonical: "/explorar-cursos" },
};

export default async function ExplorarCursosPage() {
  const queryClient = createQueryClient();
  const courses = await getActiveCourses();
  queryClient.setQueryData(["admin_courses"], courses);

  return (
    <QueryHydration state={dehydrate(queryClient)}>
      <ExploreCoursesNext />
    </QueryHydration>
  );
}
