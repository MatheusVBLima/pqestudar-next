"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PremiumBackButtonProps {
  fallbackPath: string;
  fallbackLabel?: string;
}

function labelFromPath(path: string): string {
  const segments = path.replace(/^\//, '').split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  if (!last) return 'premium';
  const map: Record<string, string> = {
    premium: 'premium',
    cursos: 'cursos',
    vagas: 'vagas',
    atualizacoes: 'atualizações',
    salvos: 'salvos',
  };
  return map[last] || last;
}

export function PremiumBackButton({ fallbackPath, fallbackLabel = 'Voltar' }: PremiumBackButtonProps) {
  const router = useRouter();
  const [hasInternalHistory, setHasInternalHistory] = useState(false);

  useEffect(() => {
    const currentHost = window.location.host;
    const referrer = document.referrer;
    setHasInternalHistory(referrer.includes(currentHost) && window.history.length > 1);
  }, []);

  const handleClick = () => {
    if (hasInternalHistory) {
      router.back();
      return;
    }
    router.push(fallbackPath);
  };

  const label = hasInternalHistory ? 'Voltar' : fallbackLabel;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className="-ml-2 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="capitalize">{label}</span>
    </Button>
  );
}
