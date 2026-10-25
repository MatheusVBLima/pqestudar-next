import type { Tables } from '@/integrations/supabase/types';

// Never select account identifiers for public author pages.
export const AUTHOR_SELECT = 'id,slug,display_name,headline,bio,education,photo_url,website_url,website_label,instagram_url,youtube_url,featured_badges,created_at' as const;
export type AuthorProfile = Omit<Tables<'author_profiles'>, 'user_id'>;
export type AuthorBadge = Tables<'author_badges'>;

export function safeAuthorUrl(value: string | null | undefined): string | undefined {
  try {
    const url = new URL(value || '');
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
  } catch { /* Invalid or empty optional URL. */ }
  return undefined;
}

export function highlightedBadges(author: AuthorProfile, badges: AuthorBadge[]) {
  const selected = author.featured_badges.map(code => badges.find(b => b.code === code)).filter((b): b is AuthorBadge => !!b);
  return [...selected, ...badges.filter(b => !selected.includes(b))].slice(0, 3);
}
