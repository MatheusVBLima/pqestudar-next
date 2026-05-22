"use client";

import Link from 'next/link';
import { ArrowRight, BookOpen, Briefcase, Gift, Sparkles, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PremiumLastViewed } from '@/hooks/usePremiumLastViewed';

const typeMeta = {
  course: { label: 'Curso', icon: BookOpen },
  job: { label: 'Vaga', icon: Briefcase },
  benefit: { label: 'Benefício', icon: Gift },
  update: { label: 'Benefício', icon: Gift },
  curation: { label: 'Curadoria', icon: Sparkles },
} as const;

export function ContinueCard({ item }: { item: PremiumLastViewed | null }) {
  if (!item) {
    return (
      <div className="rounded-[1.2rem] border border-border bg-card/80 backdrop-blur-sm shadow-card p-6 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Comece por aqui
          </span>
        </div>
        <h3 className="text-lg font-bold leading-snug mb-2">
          Sua jornada premium começa agora
        </h3>
        <p className="text-sm text-muted-foreground mb-5">
          Explore cursos, vagas e benefícios curados para acelerar seus estudos.
        </p>
        <div className="mt-auto flex flex-col gap-2">
          <Button asChild size="sm">
            <Link href="/premium/cursos">
              Ver cursos em destaque
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/premium/beneficios">Explorar benefícios</Link>
          </Button>
        </div>
      </div>
    );
  }

  const meta = typeMeta[item.type] ?? typeMeta.course;
  const Icon = meta.icon;

  const continueHref =
    item.href ??
    (item.type === 'update' && item.slug
      ? `/premium/beneficios/${item.slug}`
      : undefined);

  return (
    <div className="rounded-[1.2rem] border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card shadow-card p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <PlayCircle className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Continue de onde parou
        </span>
      </div>

      <Badge variant="secondary" className="self-start text-[10px] uppercase tracking-wide mb-2 inline-flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {meta.label}
      </Badge>

      <h3 className="text-lg font-bold leading-snug mb-4 line-clamp-3">
        {item.title}
      </h3>

      <div className="mt-auto">
        {continueHref ? (
          <Button asChild size="sm" className="w-full">
            <Link href={continueHref}>
              Continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : item.externalUrl ? (
          <Button asChild size="sm" className="w-full">
            <a href={item.externalUrl} target="_blank" rel="noopener noreferrer">
              Continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline" className="w-full">
            <Link href="/premium/salvos">Ver meus salvos</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
