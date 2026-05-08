import { Suspense, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

type RouteFallbackKind = "public" | "admin" | "premium";

interface RouteSuspenseProps {
  children: ReactNode;
  kind?: RouteFallbackKind;
}

export function RouteFallbackPublic() {
  return (
    <div className="container mx-auto px-6 py-10 space-y-8">
      <section className="space-y-4">
        <Skeleton className="h-12 w-3/4 max-w-[780px]" />
        <Skeleton className="h-6 w-2/3 max-w-[620px]" />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-48 rounded-xl" />
        ))}
      </section>
    </div>
  );
}

export function RouteFallbackAdmin() {
  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <header className="space-y-3">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-lg" />
        ))}
      </section>
    </div>
  );
}

export function RouteFallbackPremium() {
  return (
    <div className="container max-w-6xl mx-auto px-4 py-8 space-y-6">
      <header className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </header>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-64 rounded-xl" />
        ))}
      </section>
    </div>
  );
}

function RouteFallbackByKind({ kind }: { kind: RouteFallbackKind }) {
  if (kind === "admin") return <RouteFallbackAdmin />;
  if (kind === "premium") return <RouteFallbackPremium />;
  return null;
}

export function RouteSuspense({ children, kind = "public" }: RouteSuspenseProps) {
  return <Suspense fallback={<RouteFallbackByKind kind={kind} />}>{children}</Suspense>;
}
