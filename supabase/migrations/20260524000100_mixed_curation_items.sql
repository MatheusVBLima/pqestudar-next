alter table public.curation_page_items
  add column if not exists item_type text,
  add column if not exists item_id uuid;

update public.curation_page_items
set
  item_type = coalesce(item_type, 'tool'),
  item_id = coalesce(item_id, tool_id)
where item_type is null
   or item_id is null;

alter table public.curation_page_items
  alter column item_type set default 'tool',
  alter column item_type set not null,
  alter column tool_id drop not null;

alter table public.curation_page_items
  drop constraint if exists curation_page_items_item_type_check;

alter table public.curation_page_items
  add constraint curation_page_items_item_type_check
  check (item_type in ('tool', 'contest', 'guide'));

alter table public.curation_page_items
  drop constraint if exists curation_page_items_item_id_required_check;

alter table public.curation_page_items
  add constraint curation_page_items_item_id_required_check
  check (item_id is not null or tool_id is not null);
