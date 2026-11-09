'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { editorial } from '@/lib/author-editorial';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AuthorEditorialPanel } from '@/components/authors/AuthorEditorialPanel';
import { ContentReviewClient } from './ContentReviewClient';

export function ReviewCenter() {
  const params = useSearchParams();
  const tab = params.get('aba') === 'aprovacao' ? 'aprovacao' : 'informacoes';
  const [visited, setVisited] = useState(() => new Set([tab]));
  const { user } = useAuth();
  const pending = useQuery({
    queryKey: ['author-drafts', 'pending-count', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await editorial.from('author_guide_drafts')
        .select('id', { count: 'exact', head: true }).eq('status', 'in_review');
      if (error) throw error;
      return count ?? 0;
    },
  });

  return <Tabs value={tab} onValueChange={value => {
    setVisited(previous => new Set([...previous, value]));
    const url = new URL(window.location.href);
    url.searchParams.set('aba', value);
    window.history.replaceState(null, '', url);
  }}>
    <TabsList aria-label="Áreas da Central de revisão" className="mb-4 grid h-auto w-full grid-cols-2 gap-1 sm:w-fit">
      <TabsTrigger value="informacoes" className="whitespace-normal px-3 py-2 text-xs sm:text-sm">Verificação de informações</TabsTrigger>
      <TabsTrigger value="aprovacao" className="gap-2 whitespace-normal px-3 py-2 text-xs sm:text-sm">
        Guias para aprovação
        {pending.data !== undefined && <span aria-label={`${pending.data} guias aguardando aprovação`} className="rounded-md bg-primary/10 px-1.5 text-xs text-primary">{pending.data}</span>}
      </TabsTrigger>
    </TabsList>
    <TabsContent value="informacoes" forceMount className="data-[state=inactive]:hidden">
      {(visited.has('informacoes') || tab === 'informacoes') && <ContentReviewClient />}
    </TabsContent>
    <TabsContent value="aprovacao" forceMount className="data-[state=inactive]:hidden">
      {(visited.has('aprovacao') || tab === 'aprovacao') && <AuthorEditorialPanel reviewer />}
    </TabsContent>
  </Tabs>;
}
