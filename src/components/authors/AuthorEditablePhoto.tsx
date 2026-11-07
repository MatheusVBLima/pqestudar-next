'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { useOwnAuthor } from '@/hooks/useOwnAuthor';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';

export function AuthorEditablePhoto({ authorId, children }: { authorId: string; children: ReactNode }) {
  const { user, loading } = useAuth();
  const roles = useUserRoles();
  const own = useOwnAuthor();
  const owner = !own.isError && own.data?.user_id === user?.id && own.data?.id === authorId;
  const admin = !roles.loading && roles.canAccessAdmin;
  if (loading || !user || (!owner && !admin)) return children;
  const href = admin ? `/admin/autores?editar=${encodeURIComponent(authorId)}` : '/autores/meu-perfil/editar';
  return <Link href={href} aria-label="Editar perfil pela foto" title="Editar perfil" className="group relative block w-fit rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
    {children}
    <span className="pointer-events-none absolute inset-1 flex flex-col items-center justify-center gap-1 rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"><Pencil size={18} aria-hidden="true" /><span className="text-[10px] font-medium">Editar perfil</span></span>
  </Link>;
}
