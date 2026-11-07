import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';

export type DraftContent = { title: string; slug: string; short_description: string; content_markdown: string; category: string; public_category: string; cover_image_url: string; seo_title: string; seo_description: string };
export type AuthorDraft = { id: string; author_id: string; guide_id: string | null; content: DraftContent; status: 'draft' | 'in_review' | 'changes_requested' | 'published'; feedback: string; revision: number; submitted_at: string | null; reviewed_by: string | null; created_at: string; updated_at: string };
export type DraftHistory = { id: string; draft_id: string; actor_id: string; action: string; feedback: string; content: DraftContent; created_at: string };
type Table<T> = { Row: T; Insert: never; Update: never; Relationships: [] };
type EditorialDatabase = Omit<Database, 'public'> & { public: Omit<Database['public'], 'Tables' | 'Functions'> & {
  Tables: Database['public']['Tables'] & { author_guide_drafts: Table<AuthorDraft>; author_guide_history: Table<DraftHistory> };
  Functions: Database['public']['Functions'] & {
    save_author_draft: { Args: { target: string | null; payload: Json; expected_revision: number | null; source_guide?: string | null }; Returns: AuthorDraft };
    submit_author_draft: { Args: { target: string; expected_revision: number }; Returns: undefined };
    review_author_draft: { Args: { target: string; expected_revision: number; decision: string; note: string }; Returns: string | null };
    set_author_access: { Args: { target: string; account_email: string; enabled: boolean }; Returns: undefined };
  };
} };
export const editorial = supabase as unknown as SupabaseClient<EditorialDatabase>;
export const draftLabels = { draft: 'Rascunho', in_review: 'Em revisão', changes_requested: 'Ajustes solicitados', published: 'Publicado' };
export const emptyDraft: DraftContent = { title: '', slug: '', short_description: '', content_markdown: '', category: '', public_category: '', cover_image_url: '', seo_title: '', seo_description: '' };
export async function uploadAuthorImage(file: File) {
  const types: Record<string,string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  if (!types[file.type] || file.size > 5 * 1024 * 1024) throw new Error('Use JPG, PNG ou WebP de até 5 MB.');
  const bitmap = await createImageBitmap(file); bitmap.close();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Entre novamente na sua conta.');
  const path = `${user.id}/${crypto.randomUUID()}.${types[file.type]}`;
  const bucket = supabase.storage.from('author-guide-assets');
  const { error } = await bucket.upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return { path, publicUrl: bucket.getPublicUrl(path).data.publicUrl };
}
