-- Run in a transaction and always ROLLBACK. Fixtures never become visible.
do $$
declare actor uuid; target uuid:=gen_random_uuid(); run_id uuid:=gen_random_uuid(); s jsonb; result jsonb; event_id uuid; blocked boolean;
begin
 select user_id into actor from public.user_roles where role='admin' limit 1;
 if actor is null then raise exception 'An existing admin is required for transactional tests'; end if;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 insert into public.tools(id,name,slug,description,content_markdown,is_visible) values(target,'Review SQL fixture','review-fixture-'||target,'Teste isolado','O plano custa R$ 20 por mês.',false);
 s:=public.content_review_snapshot('tools',target);
 insert into public.content_review_runs(id,kind,content_id,title,route,snapshot,row_hash,claims,status,created_by)
 values(run_id,'tools',target,'Fixture','/ferramentas/test',s->'fields',s->>'row_hash','[{"id":"claim-1","field":"content_markdown","original":"O plano custa R$ 20 por mês.","status":"contradicted","sources":[{"url":"https://example.com/pricing"}]}]','ready',actor);
 -- A forged/absent session cannot invoke the SECURITY DEFINER mutation.
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 blocked:=false;
 begin perform public.content_review_commit(run_id,'[{"id":"claim-1","text":"Não permitido"}]'); exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Non-admin mutation was allowed'; end if;
 execute 'set local role authenticated';
 if exists(select 1 from public.content_review_runs where id=run_id) then raise exception 'Non-admin RLS exposed review'; end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',actor::text,true);
 execute 'set local role authenticated';
 if not exists(select 1 from public.content_review_runs where id=run_id) then raise exception 'Admin cannot read review'; end if;
 blocked:=false;
 begin update public.content_review_runs set claims='[]' where id=run_id; exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Client can forge evidence'; end if;
 result:=public.content_review_commit(run_id,'[{"id":"claim-1","text":"O plano custa R$ 30 por mês."}]');
 event_id:=(result->>'event_id')::uuid;
 execute 'reset role';
 if (select content_markdown from public.tools where id=target)<>'O plano custa R$ 30 por mês.' then raise exception 'Apply failed'; end if;
 if (select is_visible from public.tools where id=target) then raise exception 'Publication state changed'; end if;
 blocked:=false;
 begin perform public.content_review_commit(run_id,'[{"id":"claim-1","text":"Outra"}]'); exception when serialization_failure then blocked:=true; end;
 if not blocked then raise exception 'Repeated apply allowed'; end if;
 perform public.content_review_commit(run_id,'[]',event_id);
 if (select content_markdown from public.tools where id=target)<>'O plano custa R$ 20 por mês.' then raise exception 'Undo failed'; end if;
 if not exists(select 1 from public.content_review_events where id=event_id and reverted_at is not null and reverted_by=actor) then raise exception 'Undo not audited'; end if;
 -- Stale snapshot blocks correction, preserving the concurrent edit.
 update public.content_review_runs set status='ready',row_hash=(public.content_review_snapshot('tools',target)->>'row_hash') where id=run_id;
 update public.tools set description='Edição concorrente' where id=target;
 blocked:=false;
 begin perform public.content_review_commit(run_id,'[{"id":"claim-1","text":"Outra"}]'); exception when serialization_failure then blocked:=true; end;
 if not blocked then raise exception 'Stale overwrite allowed'; end if;
 if has_function_privilege('anon','public.content_review_commit(uuid,jsonb,uuid)','execute') then raise exception 'Anonymous RPC grant'; end if;
 if has_function_privilege('authenticated','public.content_review_snapshot(text,uuid)','execute') then raise exception 'Snapshot bypass grant'; end if;
end $$;
select 'PASS: admin/RLS, evidence write denial, apply, audit, undo, stale snapshot, publication preservation' as result;

do $$
declare actor uuid; target uuid; run_id uuid; s jsonb; result jsonb; kind text; field text; value text; flow jsonb;
begin
 select user_id into actor from public.user_roles where role='admin' limit 1;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 foreach kind in array array['guides','courses'] loop
  target:=gen_random_uuid();run_id:=gen_random_uuid();
  if kind='guides' then
   field:='content_markdown';
   insert into public.guides(id,title,slug,short_description,content_markdown,category,is_published,flow_data)
   values(target,'Review fixture','review-fixture-'||target,'Resumo','O limite atual é 10.',(select category from public.guides limit 1),false,
    '{"content_markdown":"O limite atual é 10.","inputs":{"tema":"Preservar"},"generated_images":[{"url":"https://example.com/image.png"}]}');
  else
   field:='description_full';
   insert into public.premium_items(id,title,slug,item_type,status,description_full,tags) values(target,'Review fixture','review-fixture-'||target,'course','draft','O limite atual é 10.','{}');
  end if;
  s:=public.content_review_snapshot(kind,target);
  insert into public.content_review_runs(id,kind,content_id,title,route,snapshot,row_hash,claims,status,created_by)
  values(run_id,kind,target,'Fixture','/test',s->'fields',s->>'row_hash',jsonb_build_array(jsonb_build_object('id','c1','field',field,'original','O limite atual é 10.','status','contradicted','sources',jsonb_build_array(jsonb_build_object('url','https://example.com')))),'ready',actor);
  result:=public.content_review_commit(run_id,'[{"id":"c1","text":"O limite atual é 20."}]');
  if kind='guides' then
   select content_markdown,flow_data into value,flow from public.guides where id=target;
   if flow->>'content_markdown'<>'O limite atual é 20.' or flow#>>'{inputs,tema}'<>'Preservar' or jsonb_array_length(flow->'generated_images')<>1 then raise exception 'Flow synchronization lost state'; end if;
  else select description_full into value from public.premium_items where id=target;
  end if;
  if value<>'O limite atual é 20.' then raise exception 'Content adapter failed for %',kind; end if;
  perform public.content_review_commit(run_id,'[]',(result->>'event_id')::uuid);
  if public.content_review_snapshot(kind,target)->'fields'->>field<>'O limite atual é 10.' then raise exception 'Adapter undo failed for %',kind; end if;
 end loop;
 if public.content_review_fingerprint('tools','{"name":"X","views":1}')<>public.content_review_fingerprint('tools','{"name":"X","views":2}') then raise exception 'Traffic counters invalidate review'; end if;
end $$;
select 'PASS: guide flow preserved, current premium course adapter, undo and traffic-counter stability' as result;
