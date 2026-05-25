do $$
begin
  create type public.subscription_plan_tier as enum ('basic', 'premium');
exception
  when duplicate_object then null;
end
$$;

alter table public.redeem_tokens
  add column if not exists plan_tier public.subscription_plan_tier not null default 'premium';

alter table public.subscriptions
  add column if not exists plan_tier public.subscription_plan_tier not null default 'premium';

create index if not exists subscriptions_plan_tier_idx
  on public.subscriptions (plan_tier);
