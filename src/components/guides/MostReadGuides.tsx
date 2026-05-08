"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface MostReadGuide {
  id: string;
  title: string;
  slug: string;
  category: string;
  views_count: number;
}

export function MostReadGuides({ excludeSlug }: { excludeSlug?: string }) {
  const { data: guides, isLoading } = useQuery({
    queryKey: ["guides", "most-read", excludeSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guides")
        .select("id, title, slug, category, views_count")
        .eq("is_published", true)
        .neq("slug", excludeSlug ?? "")
        .order("views_count", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as unknown as MostReadGuide[];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="rounded-[1.2rem] border bg-card p-5 shadow-card space-y-4">
        <Skeleton className="h-5 w-24" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 items-start">
            <Skeleton className="h-8 w-8 rounded-md shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!guides || guides.length === 0) return null;

  return (
    <div className="rounded-[1.2rem] border bg-card p-5 shadow-card">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
        Mais lidas
      </h3>

      <div className="space-y-4">
        {guides.map((guide, index) => (
          <Link
            key={guide.id}
            href={`/guias/${guide.slug}`}
            aria-label={`Abrir guia mais lido: ${guide.title}`}
            className="group flex gap-3 items-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md -mx-1 px-1 py-0.5"
          >
            {/* Number badge */}
            <span
              className={`
                shrink-0 flex items-center justify-center rounded-md text-sm font-bold w-8 h-8
                ${index === 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
                }
              `}
            >
              {index + 1}
            </span>

            <div className="min-w-0 flex-1">
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 mb-1 uppercase tracking-wide font-medium"
              >
                {guide.category}
              </Badge>
              <p className="text-sm font-medium leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {guide.title}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
