'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOwnAuthor } from '@/hooks/useOwnAuthor';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Button } from '@/components/ui/button';

export function MyAuthorProfile() {
  const { user, loading } = useAuth();
  const roles = useUserRoles();
  const own = useOwnAuthor();
  const router = useRouter();
  const slug = !own.isError && own.data?.user_id === user?.id ? own.data?.slug : undefined;
  useEffect(() => { if (!loading && user && slug) router.replace(`/autores/${slug}`); }, [loading, user, slug, router]);
  if (loading || (user && own.isPending) || slug) return <p role="status" className="p-8">Carregando seu perfil…</p>;
  return <main className="mx-auto max-w-3xl px-6 py-10">
    <h1 className="text-2xl font-bold">Meu perfil de autor</h1>
    {!user ? <><p className="mt-3 text-muted-foreground">Entre para acessar o perfil vinculado à sua conta.</p><Button asChild className="mt-4"><Link href="/login?from=%2Fautores%2Fmeu-perfil">Entrar</Link></Button></> : own.isError ? <><p role="alert" className="mt-3">Não foi possível carregar seu perfil.</p><Button className="mt-4" onClick={() => own.refetch()}>Tentar novamente</Button></> : <>
      <p className="mt-3 text-muted-foreground">Sua conta ainda não está vinculada a um perfil de autor. {roles.canAccessAdmin ? 'Vincule a conta ao perfil existente no painel de autores.' : 'Peça à administração para vincular seu perfil à sua conta.'}</p>
      {roles.canAccessAdmin && <Button asChild className="mt-4"><Link href="/admin/autores">Gerenciar autores</Link></Button>}
    </>}
  </main>;
}
