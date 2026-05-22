"use client";

import { ReactNode, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PremiumRailProps {
  title: string;
  subtitle?: string;
  viewMoreHref?: string;
  viewMoreLabel?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyState?: ReactNode;
  skeletonCount?: number;
  children?: ReactNode;
}

export function PremiumRail({
  title,
  subtitle,
  viewMoreHref,
  viewMoreLabel = 'Ver mais',
  isLoading,
  isEmpty,
  emptyState,
  skeletonCount = 4,
  children,
}: PremiumRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.85, 320);
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  if (!isLoading && isEmpty && !emptyState) return null;

  return (
    <section className="rounded-[1.2rem] border border-border bg-card/80 p-6 md:p-8 space-y-6 shadow-sm">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className="inline-flex items-center gap-1 shrink-0 self-start md:self-end rounded-full border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Anterior"
            className="hidden md:inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Próximo"
            className="hidden md:inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {viewMoreHref && (
            <>
              <span className="hidden md:inline-block h-5 w-px bg-border mx-1" aria-hidden="true" />
              <Link
                href={viewMoreHref}
                className="inline-flex items-center gap-1 px-3 h-8 rounded-full text-sm font-medium hover:bg-muted transition-colors"
              >
                {viewMoreLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
        </div>
      </header>

      {isLoading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-72 shrink-0 rounded-[1.2rem]" />
          ))}
        </div>
      ) : isEmpty ? (
        <div>{emptyState}</div>
      ) : (
        <div
          ref={scrollerRef}
          className="flex gap-4 -mx-1 -my-2 px-1 py-2 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none cursor-grab active:cursor-grabbing"
        >
          {children}
        </div>
      )}
    </section>
  );
}
