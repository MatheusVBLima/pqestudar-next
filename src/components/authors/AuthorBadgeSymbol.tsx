import { BookOpen, BriefcaseBusiness, GraduationCap, Wrench } from 'lucide-react';

function Pen({ angle = 0 }: { angle?: number }) {
  return <g transform={`rotate(${angle} 24 24)`}>
    <path d="M21 12a3 3 0 0 1 6 0v20l-3 6-3-6Z" fill="hsl(var(--card))" />
    <path d="M21 17h6M21 31h6M27 14h3v10" />
  </g>;
}

function Laurels() {
  return <g strokeWidth="1.5"><path d="M17 39C7 34 6 23 11 15M31 39c10-5 11-16 6-24" />
    <path d="m10 22-4-4m3 10-5-2m7 8-5-1m8 5-4 1m28-17 4-4m-3 10 5-2m-7 8 5-1m-8 5 4 1" />
  </g>;
}

export function AuthorBadgeSymbol({ code, title }: { code: string; title: string }) {
  if (code.startsWith('category-')) {
    const theme = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const Symbol = theme.includes('educa') ? GraduationCap : theme.includes('carreira') ? BriefcaseBusiness : theme.includes('ferramenta') ? Wrench : BookOpen;
    return <svg viewBox="0 0 48 48" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 27q9-3 17 1 8-4 17-1v12q-9-3-17 1-8-4-17-1Zm17 1v12" />
      <Symbol x="14" y="6" width="20" height="20" />
    </svg>;
  }
  return <svg viewBox="0 0 48 48" width={code === 'pioneer-20' ? 40 : 36} height={code === 'pioneer-20' ? 40 : 36} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {code.startsWith('published') ? <>
      <Pen angle={code === 'published-1' ? 38 : 42} />
      {code !== 'published-1' && <Pen angle={-42} />}
      {code === 'published-50' && <Pen />}
    </> : code === 'pioneer-20' ? <g fill="currentColor" stroke="none">
      <path d="m24 4 1.5 3.1 3.5.5-2.5 2.4.6 3.5-3.1-1.7-3.1 1.7.6-3.5L19 7.6l3.5-.5Z" />
      {/* Solid vector lettering keeps the Pq monogram readable without a font dependency. */}
      <g transform="translate(0 -1.5)">
      <path fillRule="evenodd" d="M7 16h8c6 0 9 3 9 8s-3 8-9 8h-3v7H7Zm5 5v6h3c3 0 4-1 4-3s-1-3-4-3Z" />
      <path fillRule="evenodd" d="M41 21v22h-5v-8c-1 1-3 2-5 2-5 0-8-3-8-8s3-8 8-8c2 0 4 1 5 2v-2Zm-5 8c0-2.5-1.5-4-4-4s-4 1.5-4 4 1.5 4 4 4 4-1.5 4-4Z" />
      </g>
    </g>
      : code.startsWith('consistent') ? <>
        {code === 'consistent-6' && <Laurels />}
        <rect x="14" y="13" width="20" height="23" rx="3" />
        <path d="M19 10v6m10-6v6m-15 4h20" />
        <path d="m24 23 1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6Z" fill="currentColor" fillOpacity=".15" strokeWidth="1.3" />
      </> : <>
        <g transform="rotate(-27 24 37)"><path d="M13 12h11q5-3 11 0v23q-6-3-11 0H13Z" fill="hsl(var(--card))" /></g>
        <g transform="rotate(27 24 37)"><path d="M13 12h11q5-3 11 0v23q-6-3-11 0H13Z" fill="hsl(var(--card))" /></g>
        <path d="M14 14q5-2 10 1 5-3 10-1v23q-5-2-10 1-5-3-10-1Zm10 1v23" fill="hsl(var(--card))" />
      </>}
  </svg>;
}
