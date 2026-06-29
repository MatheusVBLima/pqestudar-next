"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useNavConfig } from "@/hooks/useNavConfig";

export function CarteirinhaLogo() {
  const { logos, loading } = useNavConfig();

  if (loading) {
    return <Skeleton className="h-9 w-28 rounded-lg sm:h-10" />;
  }

  return (
    <a href="/" className="inline-flex items-center" aria-label="Ir para a página inicial do PqEstudar">
      <img
        src={logos.light}
        alt="PqEstudar"
        width={120}
        height={40}
        className="h-9 w-auto object-contain dark:hidden sm:h-10"
      />
      <img
        src={logos.dark}
        alt="PqEstudar"
        width={120}
        height={40}
        className="hidden h-9 w-auto object-contain dark:block sm:h-10"
      />
    </a>
  );
}
