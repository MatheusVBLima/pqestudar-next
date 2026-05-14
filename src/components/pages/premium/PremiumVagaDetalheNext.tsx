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
  MapPin,
  Clock,
  Bookmark,
  BookmarkCheck,
  AlertCircle,
  Building2,
  FileText,
} from "lucide-react";
import { usePremiumSavedItems } from "@/hooks/usePremiumSavedItems";
import { PremiumBackButton } from "@/components/premium/PremiumBackButton";

interface JobDetail {
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

function pickCompany(tags: string[] = []): string | undefined {
  return tags.find((t) => /^empresa:/i.test(t))?.replace(/^empresa:\s*/i, "");
}
function pickLocation(tags: string[] = []): string | undefined {
  return tags.find((t) =>
    /(remot[ao]|h[ií]brid[ao]|presencial|s[aã]o paulo|rio de janeiro|brasil|nacional)/i.test(t),
  );
}
function pickContract(tags: string[] = []): string | undefined {
  return tags.find((t) => /(clt|pj|est[aá]gio|trainee|freela|jovem aprendiz)/i.test(t));
}
function pickNovo(tags: string[] = []): boolean {
  return tags.some((t) => /novo|nova/i.test(t));
}

export default function PremiumVagaDetalheNext() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isSaved, toggleSave, isToggling } = usePremiumSavedItems();

  useEffect(() => {
    if (!slug) return;
    const fetchJob = async () => {
      try {
        const { data, error } = await supabase
          .from("premium_items")
          .select("id, title, slug, description_short, description_full, external_url, logo_url, tags, status")
          .eq("slug", slug)
          .eq("item_type", "job")
          .single();
        if (error) throw error;
        if (!data) throw new Error("Vaga não encontrada");
        setJob(data as JobDetail);
      } catch (err) {
        console.error("Error fetching job:", err);
        setError("Não foi possível carregar esta vaga.");
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
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

  if (error || !job) {
    return (
      <main className="w-full max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">
        <div className="text-center py-16 max-w-lg mx-auto">
          <AlertCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Vaga não encontrada</h1>
          <p className="text-muted-foreground mb-6">
            {error || "Esta vaga não está disponível no momento."}
          </p>
          <Button asChild>
            <Link href="/premium/vagas">Voltar para vagas</Link>
          </Button>
        </div>
      </main>
    );
  }

  const tags = job.tags ?? [];
  const company = pickCompany(tags);
  const location = pickLocation(tags);
  const contract = pickContract(tags);
  const isNovo = pickNovo(tags);
  const hasExternalUrl = !!job.external_url;
  const saved = isSaved(job.id);

  return (
    <main className="w-full max-w-[1440px] mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">
      <div className="max-w-3xl mx-auto space-y-8">
        <PremiumBackButton fallbackPath="/premium/vagas" fallbackLabel="Vagas" />

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {isNovo && (
              <Badge variant="secondary" className="text-xs uppercase tracking-wide">
                Nova
              </Badge>
            )}
            {contract && <Badge variant="outline" className="text-xs">{contract}</Badge>}
            {job.status !== "published" && (
              <Badge variant="outline" className="text-xs">Em breve</Badge>
            )}
          </div>

          <div className="flex items-start gap-4">
            {job.logo_url && (
              <img
                src={job.logo_url}
                alt=""
                className="h-14 w-14 rounded-xl object-cover border border-border shrink-0"
                referrerPolicy="no-referrer"
              />
            )}
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-snug">
              {job.title}
            </h1>
          </div>

          {job.description_short && (
            <p className="text-base text-muted-foreground leading-relaxed">
              {job.description_short}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {company && (
            <div className="flex items-center gap-2.5 p-3 rounded-[1.2rem] border border-border bg-card">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Empresa</p>
                <p className="text-sm font-medium">{company}</p>
              </div>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-2.5 p-3 rounded-[1.2rem] border border-border bg-card">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Local</p>
                <p className="text-sm font-medium">{location}</p>
              </div>
            </div>
          )}
          {contract && (
            <div className="flex items-center gap-2.5 p-3 rounded-[1.2rem] border border-border bg-card">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Contrato</p>
                <p className="text-sm font-medium">{contract}</p>
              </div>
            </div>
          )}
        </div>

        {hasExternalUrl ? (
          <div className="rounded-[1.2rem] border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-8 md:p-10 text-center space-y-5 shadow-card">
            <div className="space-y-2 max-w-xl mx-auto">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                Quer se candidatar a esta vaga?
              </h2>
              <p className="text-sm md:text-base text-muted-foreground">
                Você será direcionado para{" "}
                <span className="font-medium text-foreground">
                  {new URL(job.external_url!).hostname.replace(/^www\./, "")}
                </span>
                , a plataforma oficial da oportunidade.
              </p>
            </div>

            <div className="flex flex-col items-center gap-3 pt-2">
              <Button
                size="lg"
                className="w-full sm:w-auto sm:min-w-[280px] h-12 text-base font-semibold"
                asChild
              >
                <a href={job.external_url!} target="_blank" rel="noopener noreferrer">
                  Acessar vaga
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSave(job.id, { title: job.title, slug: job.slug })}
                disabled={isToggling(job.id)}
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
                Ainda estamos finalizando o link oficial desta vaga. Salve para ser avisado quando estiver disponível.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleSave(job.id, { title: job.title, slug: job.slug })}
              disabled={isToggling(job.id)}
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
                  Salvar vaga
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
