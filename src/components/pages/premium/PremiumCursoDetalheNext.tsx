"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ExternalLink,
  Clock,
  GraduationCap,
  Monitor,
  MapPin,
  Bookmark,
  BookmarkCheck,
  AlertCircle,
} from "lucide-react";
import { usePremiumSavedItems } from "@/hooks/usePremiumSavedItems";
import { PremiumBackButton } from "@/components/premium/PremiumBackButton";

interface CourseDetail {
  id: string;
  title: string;
  slug: string;
  description_short: string | null;
  description_full: string | null;
  external_url: string | null;
  logo_url: string | null;
  tags: string[] | null;
  status: string;
}

function pickHours(tags: string[] = []): string | undefined {
  return tags.find((x) => /\d+\s*h(oras)?/i.test(x));
}
function pickModality(tags: string[] = []): string | undefined {
  return tags.find((x) => /(ead|presencial|h[ií]brido|online|remoto)/i.test(x));
}
function pickType(tags: string[] = []): string | undefined {
  return tags.find((x) =>
    /(curta|extens[aã]o|forma[çc][aã]o|gradua[çc][aã]o|p[óo]s|t[ée]cnico|livre)/i.test(x),
  );
}
function pickLevel(tags: string[] = []): string | undefined {
  return tags.find((x) => /(iniciante|intermedi[áa]rio|avan[çc]ado|b[áa]sico)/i.test(x));
}
function pickInstitution(tags: string[] = []): string | undefined {
  const known = ["usp", "unesp", "unicamp", "fundação bradesco", "coursera", "udemy", "edx", "fiap", "alura", "rocketseat"];
  return (
    tags.find((x) => known.some((k) => x.toLowerCase().includes(k))) ||
    tags.find(
      (x) =>
        x.length > 3 &&
        !/(ead|presencial|h[ií]brido|online|remoto|\d+\s*h|curta|extens[aã]o|forma[çc][aã]o|gradua[çc][aã]o|p[óo]s|t[ée]cnico|livre|iniciante|intermedi[áa]rio|avan[çc]ado|b[áa]sico)/i.test(x),
    )
  );
}

export default function PremiumCursoDetalheNext() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isSaved, toggleSave, isToggling } = usePremiumSavedItems();

  useEffect(() => {
    if (!slug) return;
    const fetchCourse = async () => {
      try {
        const { data, error } = await supabase
          .from("premium_items")
          .select("id, title, slug, description_short, description_full, external_url, logo_url, tags, status")
          .eq("slug", slug)
          .eq("item_type", "course")
          .single();
        if (error) throw error;
        if (!data) throw new Error("Curso não encontrado");
        setCourse(data as CourseDetail);
      } catch (err) {
        console.error("Error fetching course:", err);
        setError("Não foi possível carregar este curso.");
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [slug]);

  if (loading) {
    return (
      <main className="w-full max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">
        <div className="max-w-3xl mx-auto space-y-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-24 rounded-[1.2rem]" />
            <Skeleton className="h-24 rounded-[1.2rem]" />
            <Skeleton className="h-24 rounded-[1.2rem]" />
          </div>
          <Skeleton className="h-48 rounded-[1.2rem]" />
        </div>
      </main>
    );
  }

  if (error || !course) {
    return (
      <main className="w-full max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">
        <div className="text-center py-16 max-w-lg mx-auto">
          <AlertCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Curso não encontrado</h1>
          <p className="text-muted-foreground mb-6">
            {error || "Este curso não está disponível no momento."}
          </p>
          <Button asChild>
            <Link href="/premium/cursos">Voltar para cursos</Link>
          </Button>
        </div>
      </main>
    );
  }

  const tags = course.tags ?? [];
  const type = pickType(tags);
  const hours = pickHours(tags);
  const modality = pickModality(tags);
  const level = pickLevel(tags);
  const institution = pickInstitution(tags);
  const hasExternalUrl = !!course.external_url;
  const saved = isSaved(course.id);

  return (
    <main className="w-full max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">
      <div className="max-w-3xl mx-auto space-y-8">
        <PremiumBackButton fallbackPath="/premium/cursos" fallbackLabel="Cursos" />

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {type && (
              <Badge variant="secondary" className="text-xs uppercase tracking-wide">
                {type}
              </Badge>
            )}
            {course.status !== "published" && (
              <Badge variant="outline" className="text-xs">Em breve</Badge>
            )}
          </div>

          <div className="flex items-start gap-4">
            {course.logo_url && (
              <img
                src={course.logo_url}
                alt=""
                className="h-14 w-14 rounded-xl object-cover border border-border shrink-0"
                referrerPolicy="no-referrer"
              />
            )}
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-snug">
              {course.title}
            </h1>
          </div>

          {course.description_short && (
            <p className="text-base text-muted-foreground leading-relaxed">
              {course.description_short}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {modality && (
            <div className="flex items-center gap-2.5 p-3 rounded-[1.2rem] border border-border bg-card">
              <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Modalidade</p>
                <p className="text-sm font-medium">{modality}</p>
              </div>
            </div>
          )}
          {level && (
            <div className="flex items-center gap-2.5 p-3 rounded-[1.2rem] border border-border bg-card">
              <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Nível</p>
                <p className="text-sm font-medium">{level}</p>
              </div>
            </div>
          )}
          {hours && (
            <div className="flex items-center gap-2.5 p-3 rounded-[1.2rem] border border-border bg-card">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Duração</p>
                <p className="text-sm font-medium">{hours}</p>
              </div>
            </div>
          )}
          {institution && (
            <div className="flex items-center gap-2.5 p-3 rounded-[1.2rem] border border-border bg-card">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Instituição</p>
                <p className="text-sm font-medium">{institution}</p>
              </div>
            </div>
          )}
        </div>

        {hasExternalUrl ? (
          <div className="rounded-[1.2rem] border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-8 md:p-10 text-center space-y-5 shadow-card">
            <div className="space-y-2 max-w-xl mx-auto">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                Pronto para começar este curso?
              </h2>
              <p className="text-sm md:text-base text-muted-foreground">
                Você será direcionado para{" "}
                <span className="font-medium text-foreground">
                  {new URL(course.external_url!).hostname.replace(/^www\./, "")}
                </span>
                , a plataforma oficial do curso.
              </p>
            </div>

            <div className="flex flex-col items-center gap-3 pt-2">
              <Button
                size="lg"
                className="w-full sm:w-auto sm:min-w-[280px] h-12 text-base font-semibold"
                asChild
              >
                <a href={course.external_url!} target="_blank" rel="noopener noreferrer">
                  Acessar curso
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSave(course.id, { title: course.title, slug: course.slug })}
                disabled={isToggling(course.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                {saved ? (
                  <>
                    <BookmarkCheck className="h-4 w-4 mr-2" />
                    Salvo nos seus itens
                  </>
                ) : (
                  <>
                    <Bookmark className="h-4 w-4 mr-2" />
                    Salvar para depois
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-[1.2rem] border border-dashed border-border bg-muted/30 p-8 md:p-10 text-center space-y-4">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-muted text-muted-foreground mx-auto">
              <Clock className="h-5 w-5" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-lg md:text-xl font-semibold">Acesso em breve</h2>
              <p className="text-sm text-muted-foreground">
                Ainda estamos finalizando o link oficial deste curso. Salve para ser avisado quando estiver disponível.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleSave(course.id, { title: course.title, slug: course.slug })}
              disabled={isToggling(course.id)}
              className="mt-2"
            >
              {saved ? (
                <>
                  <BookmarkCheck className="h-4 w-4 mr-2" />
                  Salvo
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4 mr-2" />
                  Salvar curso
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
