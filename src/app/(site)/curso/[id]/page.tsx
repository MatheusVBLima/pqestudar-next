import type { Metadata } from "next";
import CourseDetailNext from "@/components/pages/CourseDetailNext";

interface CoursePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Curso ${id} | PqEstudar`,
    description: "Detalhes do curso",
    robots: { index: false, follow: true },
    alternates: { canonical: `/curso/${id}` },
  };
}

export default function CursoDetalhePage() {
  return <CourseDetailNext />;
}
