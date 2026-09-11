"use client";

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { attachDraggableLoop } from '@/lib/draggable-loop';
import { supabase } from '@/integrations/supabase/client';
import styles from './home-partners.module.css';

type Partner = { id: string; name: string; profile_url: string; photo_url: string };

function safeUrl(value: string, image = false) {
  try {
    const url = new URL(value);
    return (image ? url.protocol === 'https:' : ['https:', 'http:'].includes(url.protocol)) && !url.username && !url.password;
  } catch { return false; }
}

function PartnerRow({ partners, reverse = false }: { partners: Partner[]; reverse?: boolean }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!rowRef.current || !trackRef.current) return;
    return attachDraggableLoop(rowRef.current, trackRef.current, reverse);
  }, [partners.length, reverse]);
  // Each identical half fills even wide screens, so the loop has no empty seam.
  const copies = Math.max(1, Math.ceil(14 / partners.length));
  const repeated = Array.from({ length: copies }, () => partners).flat();
  return <div className={styles.row} ref={rowRef}>
    <div className={styles.track} ref={trackRef}>
      {[0, 1].map(half => <div className={styles.group} key={half} aria-hidden={half === 1 ? true : undefined}>
        {repeated.map((partner, index) => <a key={`${partner.id}-${index}`} href={partner.profile_url} target="_blank" rel="noopener noreferrer" className={styles.portrait}
          tabIndex={half === 1 || index >= partners.length ? -1 : undefined}
          aria-hidden={index >= partners.length ? true : undefined}
          aria-label={`Visitar perfil de ${partner.name} (abre em nova aba)`}>
          <span className={styles.name} aria-hidden="true">{partner.name}</span>
          <span className={styles.photo}>
          {/* External editorial photos are loaded directly, without a server-side URL proxy. */}
          <img src={partner.photo_url} alt={partner.name} width={150} height={150} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
          <span className={styles.profileHint} aria-hidden="true"><ExternalLink size={30} strokeWidth={2.5} /></span>
          </span>
        </a>)}
      </div>)}
    </div>
  </div>;
}

export function HomePartnersSection() {
  const { data } = useQuery({
    queryKey: ['home-influencer-partners'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_home_influencer_partners');
      if (error) throw error;
      return data.filter(partner => safeUrl(partner.profile_url) && safeUrl(partner.photo_url, true));
    },
    staleTime: 60_000,
  });
  if (!data?.length) return null;
  const top = data.filter((_, index) => index % 2 === 0);
  const bottom = data.filter((_, index) => index % 2 === 1);
  return <section className={styles.section} aria-labelledby="home-partners-title">
    <div className={styles.heading}>
      <h2 id="home-partners-title">Quem apoia o <span className="text-primary">PqEstudar</span></h2>
      <p>Conheça os criadores que fazem parte dessa parceria e ajudam a levar oportunidades a mais pessoas.</p>
    </div>
    <div className={styles.rows}>
      <PartnerRow partners={top} />
      <PartnerRow partners={bottom.length ? bottom : top} reverse />
    </div>
  </section>;
}
