'use client';

import { useState } from 'react';
import { GraduationCap } from 'lucide-react';

export function AuthorBiography({ name, bio, education }: { name: string; bio: string | null; education: string | null }) {
  const [expanded, setExpanded] = useState(false);
  return <section className="min-w-0 lg:col-start-1 lg:row-start-1">
    <h2 className="text-xl font-bold">Sobre {name}</h2>
    {bio && <>
      <p className={`mt-3 whitespace-pre-line break-words leading-relaxed text-muted-foreground ${expanded ? '' : 'line-clamp-3 lg:line-clamp-none'}`}>{bio}</p>
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="mt-2 min-h-11 text-sm font-medium text-primary hover:underline lg:hidden">{expanded ? 'Ler menos' : 'Ler mais'}</button>
    </>}
    {education && <>
      <details className="mt-3 border-y py-3 lg:hidden">
        <summary className="cursor-pointer text-sm font-semibold">Formação e experiência</summary>
        <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">{education}</p>
      </details>
      <div className="mt-5 hidden border-l-2 border-primary/20 pl-4 lg:block"><h3 className="flex items-center gap-2 text-sm font-semibold"><GraduationCap size={18} />Formação e experiência</h3><p className="mt-2 whitespace-pre-line break-words text-sm text-muted-foreground">{education}</p></div>
    </>}
  </section>;
}
