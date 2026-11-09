-- Wrap in BEGIN/ROLLBACK. These fixtures must never be committed.
do $$
declare actor uuid; item uuid:=gen_random_uuid(); s jsonb; saved jsonb; denied boolean;
begin
 select user_id into actor from public.user_roles where role='admin' limit 1;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 insert into public.tools(id,name,slug,description,content_markdown,is_visible) values(item,'Manual fixture','manual-'||item,'Resumo','Texto original.',false);
 s:=public.content_review_snapshot('tools',item);
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 denied:=false;begin perform public.content_review_save_manual('tools',item,s->>'row_hash','{"name":"Invadido"}');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Non-admin manual write allowed';end if;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 denied:=false;begin perform public.content_review_save_manual('tools',item,s->>'row_hash','{"is_visible":true}');exception when others then denied:=true;end;
 if not denied then raise exception 'Publication mutation allowed';end if;
 execute 'set local role authenticated';
 saved:=public.content_review_save_manual('tools',item,s->>'row_hash',jsonb_build_object('content_markdown','**Texto formatado.**'));
 execute 'reset role';
 if (select content_markdown from public.tools where id=item)<>'**Texto formatado.**' then raise exception 'Manual save failed';end if;
 if not exists(select 1 from public.content_review_events where id=(saved->>'event_id')::uuid and changes->>'type'='manual_edit') then raise exception 'Manual audit missing';end if;
 denied:=false;begin perform public.content_review_save_manual('tools',item,s->>'row_hash','{"name":"Lost update"}');exception when serialization_failure then denied:=true;end;
 if not denied then raise exception 'Stale manual write allowed';end if;
 perform public.content_review_commit((saved->>'run_id')::uuid,'[]',(saved->>'event_id')::uuid);
 if (select content_markdown from public.tools where id=item)<>'Texto original.' then raise exception 'Manual undo failed';end if;
 if has_function_privilege('anon','public.content_review_save_manual(text,uuid,text,jsonb)','execute') then raise exception 'Anonymous manual RPC grant';end if;
end $$;
select 'PASS: manual admin guard, field whitelist, formatting, audit, stale writes and undo' as result;

do $$
declare actor uuid; item uuid:=gen_random_uuid(); source text:='O limite atual é 10.'; image_tag text:='<img src="https://example.com/image.png" />'; s jsonb; saved jsonb; flow jsonb;
begin
 select user_id into actor from public.user_roles where role='admin' limit 1;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 insert into public.guides(id,title,slug,short_description,content_markdown,category,is_published,flow_data)
 values(item,'Manual guide','manual-guide-'||item,'Resumo',source||E'\n\n'||image_tag,(select category from public.guides limit 1),false,
 jsonb_build_object('content_markdown',source,'inputs',jsonb_build_object('tema','Preservar'),'generated_images',jsonb_build_array(jsonb_build_object('url','https://example.com/image.png'))));
 s:=public.content_review_snapshot('guides',item);
 saved:=public.content_review_save_manual('guides',item,s->>'row_hash',jsonb_build_object('content_markdown',replace(source,'10','20')||E'\n\n'||image_tag));
 select flow_data into flow from public.guides where id=item;
 if flow->>'content_markdown'<>'O limite atual é 20.' or flow#>>'{inputs,tema}'<>'Preservar' or jsonb_array_length(flow->'generated_images')<>1 then raise exception 'Manual guide flow lost state';end if;
 perform public.content_review_commit((saved->>'run_id')::uuid,'[]',(saved->>'event_id')::uuid);
 if (select flow_data->>'content_markdown' from public.guides where id=item)<>source then raise exception 'Manual guide flow undo failed';end if;
end $$;
select 'PASS: manual guide edits preserve injected images and flow state' as result;
