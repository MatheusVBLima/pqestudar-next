-- The review workspace is strictly admin-only, including direct RPC access.
create table public.content_review_runs (
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in ('guides','tools','courses')),
 content_id uuid not null,
 title text not null,
 route text not null,
 snapshot jsonb not null,
 row_hash text not null,
 claims jsonb not null default '[]',
 status text not null default 'extracting' check(status in ('extracting','ready','failed','applied')),
 error text,
 version integer not null default 0,
 lease_until timestamptz,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create index on public.content_review_runs(kind,content_id,created_at desc);
create index on public.content_review_runs(created_by,created_at desc);
create table public.content_review_events (
 id uuid primary key default gen_random_uuid(),
 run_id uuid not null references public.content_review_runs(id),
 kind text not null,
 content_id uuid not null,
 actor_id uuid not null references auth.users(id),
 before_fields jsonb not null,
 after_fields jsonb not null,
 after_hash text not null,
 changes jsonb not null,
 created_at timestamptz not null default now(),
 reverted_at timestamptz,
 reverted_by uuid references auth.users(id)
);
create index on public.content_review_events(kind,content_id,created_at desc);
alter table public.content_review_runs enable row level security;
alter table public.content_review_events enable row level security;
revoke all on public.content_review_runs,public.content_review_events from anon,authenticated;
grant select on public.content_review_runs,public.content_review_events to authenticated;
grant all on public.content_review_runs,public.content_review_events to service_role;
create policy review_admin_read on public.content_review_runs for select to authenticated using(public.has_role(auth.uid(),'admin'));
create policy review_events_admin_read on public.content_review_events for select to authenticated using(public.has_role(auth.uid(),'admin'));

create function public.content_review_fields(p_kind text) returns text[] language sql immutable set search_path=public,pg_temp as $$
 select case p_kind
 when 'guides' then array['title','short_description','content_markdown','cta_top_text','cta_middle_text','cta_final_text']
 when 'tools' then array['name','description','content_markdown','cta_top_text','cta_middle_text','cta_final_text']
 when 'courses' then array['title','description_short','description_full'] end
$$;

-- Traffic counters must not invalidate an editorial review.
create function public.content_review_fingerprint(p_kind text,p_row jsonb) returns text
language sql immutable set search_path=public,pg_temp as $$
 select md5(jsonb_object_agg(k,p_row->k)::text) from unnest(public.content_review_fields(p_kind)||array['flow_data','slug','is_visible','is_published','status','item_type','tags']) k
$$;
revoke all on function public.content_review_fingerprint(text,jsonb) from public,anon,authenticated;

-- Trusted service obtains a snapshot and its version from the same database read.
create function public.content_review_snapshot(p_kind text,p_id uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare r jsonb; f jsonb; keys text[];
begin
 keys:=public.content_review_fields(p_kind);
 if keys is null then raise exception 'Invalid content type'; end if;
 execute format('select to_jsonb(t) from public.%I t where id=$1',case when p_kind='courses' then 'premium_items' else p_kind end) into r using p_id;
 if r is null then raise exception 'Content not found'; end if;
 if p_kind='courses' and (r->>'item_type'<>'course' or r->'tags' ? '__benefit') then raise exception 'Not a course'; end if;
 select jsonb_object_agg(k,r->k) into f from unnest(keys) k;
 return jsonb_build_object('fields',f,'row_hash',public.content_review_fingerprint(p_kind,r),'title',coalesce(r->>'title',r->>'name'),'slug',r->>'slug','url',coalesce(r->>'url',r->>'external_url'));
end $$;
revoke all on function public.content_review_snapshot(text,uuid) from public,anon,authenticated;
grant execute on function public.content_review_snapshot(text,uuid) to service_role;

-- Apply or undo is one transaction. No client can supply arbitrary table/column names.
create function public.content_review_commit(p_run uuid,p_changes jsonb default '[]',p_undo uuid default null) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare run public.content_review_runs; ev public.content_review_events; r jsonb; before_doc jsonb; next_doc jsonb;
 keys text[]; change jsonb; claim jsonb; old_text text; new_text text; field text; assignments text; final_row jsonb; event_id uuid; target_table text;
begin
 if auth.uid() is null or not coalesce(public.has_role(auth.uid(),'admin'),false) then raise exception 'Admin access required' using errcode='42501'; end if;
 select * into run from public.content_review_runs where id=p_run for update;
 if not found then raise exception 'Review not found'; end if;
 keys:=public.content_review_fields(run.kind);
 if keys is null then raise exception 'Invalid content type'; end if;
 target_table:=case when run.kind='courses' then 'premium_items' else run.kind end;
 execute format('select to_jsonb(t) from public.%I t where id=$1 for update',target_table) into r using run.content_id;
 if r is null then raise exception 'Content not found'; end if;
 if run.kind='courses' and (r->>'item_type'<>'course' or r->'tags' ? '__benefit') then raise exception 'Not a course'; end if;
 select jsonb_object_agg(k,r->k) into before_doc from unnest(keys) k;
 if run.kind='guides' and r ? 'flow_data' then before_doc:=before_doc||jsonb_build_object('flow_data',r->'flow_data'); end if;
 if p_undo is not null then
   select * into ev from public.content_review_events where id=p_undo and run_id=p_run for update;
   if not found or ev.reverted_at is not null then raise exception 'Correction already undone or not found'; end if;
   if public.content_review_fingerprint(run.kind,r)<>ev.after_hash then raise exception 'Content changed since correction. Review again.' using errcode='40001'; end if;
   next_doc:=ev.before_fields;
 else
   if run.status<>'ready' or public.content_review_fingerprint(run.kind,r)<>run.row_hash or run.lease_until>now() then raise exception 'Content changed, research active or review already applied. Review again.' using errcode='40001'; end if;
   if jsonb_typeof(p_changes)<>'array' or jsonb_array_length(p_changes) not between 1 and 30 then raise exception 'Invalid changes'; end if;
   if (select count(distinct c->>'id') from jsonb_array_elements(p_changes) c)<>jsonb_array_length(p_changes) then raise exception 'Duplicate changes'; end if;
   next_doc:=before_doc;
   for change in select value from jsonb_array_elements(p_changes) loop
     select c into claim from jsonb_array_elements(run.claims) c where c->>'id'=change->>'id';
     if claim is null or claim->>'status' not in ('contradicted','uncertain') or jsonb_array_length(claim->'sources')=0 then raise exception 'Correction requires evidence'; end if;
     field:=claim->>'field'; old_text:=claim->>'original'; new_text:=btrim(change->>'text');
     if not (field=any(keys)) or old_text is null or length(old_text)=0 or new_text is null or length(new_text) not between 1 and 3000 then raise exception 'Invalid correction'; end if;
     if next_doc->>field is null or (length(next_doc->>field)-length(replace(next_doc->>field,old_text,'')))/length(old_text)<>1 then raise exception 'Ambiguous or changed excerpt'; end if;
     next_doc:=jsonb_set(next_doc,array[field],to_jsonb(replace(next_doc->>field,old_text,new_text)));
     -- Keep the editable flow in sync without dropping inputs or generated images.
     if run.kind='guides' and jsonb_typeof(next_doc->'flow_data')='object' then
       if field='content_markdown' and next_doc->'flow_data'->>'content_markdown' is not null then
         if (length(next_doc->'flow_data'->>'content_markdown')-length(replace(next_doc->'flow_data'->>'content_markdown',old_text,'')))/length(old_text)<>1 then
           raise exception 'The saved flow differs from the published text. Synchronize it before correcting.' using errcode='40001';
         end if;
         next_doc:=jsonb_set(next_doc,array['flow_data','content_markdown'],to_jsonb(replace(next_doc->'flow_data'->>'content_markdown',old_text,new_text)));
       elsif field in ('title','short_description') then
         next_doc:=jsonb_set(next_doc,array['flow_data',field],next_doc->field);
       elsif field like 'cta_%_text' and jsonb_typeof(next_doc->'flow_data'->replace(field,'_text',''))='object' then
         next_doc:=jsonb_set(next_doc,array['flow_data',replace(field,'_text',''),'text'],next_doc->field);
       end if;
     end if;
   end loop;
 end if;
 if next_doc ? 'flow_data' then keys:=array_append(keys,'flow_data'); end if;
 select string_agg(format('%I = (jsonb_populate_record(null::public.%I,$1)).%I',k,target_table,k),', ') into assignments from unnest(keys) k;
 execute format('update public.%I set %s where id=$2',target_table,assignments) using next_doc,run.content_id;
 execute format('select to_jsonb(t) from public.%I t where id=$1',target_table) into final_row using run.content_id;
 if p_undo is null then
   insert into public.content_review_events(run_id,kind,content_id,actor_id,before_fields,after_fields,after_hash,changes)
   values(run.id,run.kind,run.content_id,auth.uid(),before_doc,next_doc,public.content_review_fingerprint(run.kind,final_row),p_changes) returning id into event_id;
   update public.content_review_runs set status='applied',version=version+1 where id=run.id;
 else
   update public.content_review_events set reverted_at=now(),reverted_by=auth.uid() where id=p_undo;
   event_id:=p_undo;
 end if;
 return jsonb_build_object('event_id',event_id,'route',run.route,'kind',run.kind);
end $$;
revoke all on function public.content_review_fields(text) from public,anon,authenticated;
revoke all on function public.content_review_commit(uuid,jsonb,uuid) from public,anon;
grant execute on function public.content_review_commit(uuid,jsonb,uuid) to authenticated;
