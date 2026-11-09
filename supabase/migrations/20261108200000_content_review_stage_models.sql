alter table public.content_review_runs
 add column if not exists text_model text,
 add column if not exists search_model text;
-- NULL preserves the original pipeline for older runs; new runs persist both stages.
