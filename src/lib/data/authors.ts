import 'server-only';
import { cache } from 'react';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { AUTHOR_SELECT } from '@/lib/authors';
import { isMissingAuthorProfiles } from '@/lib/author-schema';

export const getAuthors = cache(async () => {
  const { data, error } = await createServerSupabaseClient().from('author_profiles').select(AUTHOR_SELECT).order('display_name');
  if (error) throw new Error(isMissingAuthorProfiles(error) ? 'Os perfis de autores ainda não foram ativados.' : 'Não foi possível carregar os autores.');
  return data;
});

// Author enrichment must never take the existing guide pages offline.
export const getGuideAuthors = cache(async () => {
  try { return await getAuthors(); }
  catch {
    console.warn('[guides] Author profiles unavailable; keeping the original bylines.');
    return [];
  }
});

export const getAuthor = cache(async (slug: string) => {
  const db = createServerSupabaseClient();
  const { data: author, error } = await db.from('author_profiles').select(AUTHOR_SELECT).eq('slug', slug).maybeSingle();
  if (error) throw new Error('Não foi possível carregar o autor.');
  if (!author) return null;
  const [badges, guides] = await Promise.all([
    db.from('author_badges').select('*').eq('author_id', author.id).order('earned_at', { ascending: false }),
    db.from('guides').select('id,title,slug,short_description,public_category,category,cover_image_url').eq('author_id', author.id).eq('is_published', true).order('created_at', { ascending: false }),
  ]);
  if (badges.error || guides.error) throw new Error('Não foi possível carregar as contribuições do autor.');
  return { author, badges: badges.data, guides: guides.data };
});
