"use client";

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Bookmark, BookmarkCheck } from 'lucide-react';
import { visiblePremiumTags } from '@/lib/premium-benefits';
import { premiumArt } from '@/lib/premium-art';
import styles from '@/components/pages/premium/PremiumHome.module.css';

interface Props {
  title: string;
  slug: string;
  description?: string | null;
  tags: string[];
  isSaved: boolean;
  isToggling: boolean;
  onToggleSave: () => void;
  onOpen: () => void;
}

export function VisualBenefitCard({ title, slug, description, tags, isSaved, isToggling, onToggleSave, onOpen }: Props) {
  return (
    <article className={styles.benefitCard}>
      <Image src={`/images/premium/${premiumArt(title, tags)}.webp`} alt="" fill sizes="(max-width: 640px) 76vw, 260px" className={styles.cardImage} />
      <div className={styles.cardShade} />
      <span className={styles.tag}>{visiblePremiumTags(tags)[0] || 'Benefício'}</span>
      <div className={styles.cardContent}>
        <Link href={`/premium/beneficios/${slug}`} onClick={onOpen} className={styles.benefitLink}>
          <h3>{title}</h3>
          <p>{description}</p>
          <span className={styles.cardAction}>Ver benefício <ArrowRight size={15} /></span>
        </Link>
        <button type="button" className={styles.save} onClick={onToggleSave} disabled={isToggling} aria-pressed={isSaved} aria-label={isSaved ? `Remover ${title} dos salvos` : `Salvar ${title}`}>
          {isSaved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
        </button>
      </div>
    </article>
  );
}
