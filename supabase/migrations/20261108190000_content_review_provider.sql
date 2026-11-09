-- Existing analyses retain their original provider.
alter table public.content_review_runs add column if not exists provider text not null default 'openai' check (provider in ('openai','lovable'));
