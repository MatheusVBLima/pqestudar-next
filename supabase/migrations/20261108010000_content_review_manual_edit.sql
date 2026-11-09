-- Human edits are audited independently from AI verdicts and need no provider call.
create function public.content_review_save_manual(p_kind text,p_id uuid,p_expected_hash text,p_fields jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare keys text[]; target_table text; r jsonb; before_doc jsonb; next_doc jsonb; f text; assignments text;
 old_text text; new_text text; flow_text text; prefix_len int; suffix_len int; old_middle text; new_middle text;
 review_id uuid; event_id uuid; route text; final_row jsonb; left_context int; right_context int; range_start int; range_end int; patched boolean;
begin
 if auth.uid() is null or not coalesce(public.has_role(auth.uid(),'admin'),false) then raise exception 'Admin access required' using errcode='42501'; end if;
 keys:=public.content_review_fields(p_kind);
 if keys is null or jsonb_typeof(p_fields)<>'object' or length(p_fields::text)>80000 then raise exception 'Invalid fields'; end if;
 if exists(select 1 from jsonb_object_keys(p_fields) k where not(k=any(keys))) then raise exception 'Invalid field'; end if;
 target_table:=case when p_kind='courses' then 'premium_items' else p_kind end;
 execute format('select to_jsonb(t) from public.%I t where id=$1 for update',target_table) into r using p_id;
 if r is null then raise exception 'Content not found'; end if;
 if p_kind='courses' and (r->>'item_type'<>'course' or r->'tags' ? '__benefit') then raise exception 'Not a course'; end if;
 if p_expected_hash is null or public.content_review_fingerprint(p_kind,r)<>p_expected_hash then raise exception 'Content changed. Reload before saving.' using errcode='40001'; end if;
 select jsonb_object_agg(k,r->k) into before_doc from unnest(keys) k;
 if p_kind='guides' then before_doc:=before_doc||jsonb_build_object('flow_data',r->'flow_data'); end if;
 next_doc:=before_doc;
 for f in select jsonb_object_keys(p_fields) loop
  if jsonb_typeof(p_fields->f)<>'string' or length(p_fields->>f)>60000 then raise exception 'Invalid text'; end if;
  old_text:=coalesce(r->>f,'');new_text:=p_fields->>f;
  if f in ('title','name') and length(btrim(new_text))=0 then raise exception 'Title is required'; end if;
  next_doc:=jsonb_set(next_doc,array[f],to_jsonb(new_text));
  if old_text=new_text then continue; end if;
  if p_kind='guides' and jsonb_typeof(next_doc->'flow_data')='object' then
   if f='content_markdown' and next_doc->'flow_data'->>'content_markdown' is not null then
    flow_text:=next_doc->'flow_data'->>'content_markdown';
    if flow_text=old_text then flow_text:=new_text;
    else
     -- Preserve images injected at publication: patch only a uniquely matching editable range.
     prefix_len:=0;suffix_len:=0;
     while prefix_len<least(length(old_text),length(new_text)) and substr(old_text,prefix_len+1,1)=substr(new_text,prefix_len+1,1) loop prefix_len:=prefix_len+1; end loop;
     while suffix_len<least(length(old_text),length(new_text))-prefix_len and substr(old_text,length(old_text)-suffix_len,1)=substr(new_text,length(new_text)-suffix_len,1) loop suffix_len:=suffix_len+1; end loop;
     -- Grow a unique anchor without unnecessarily including an injected image.
     patched:=false;
     foreach left_context in array array[0,16,32] loop
      foreach right_context in array array[0,16,32] loop
       range_start:=greatest(0,prefix_len-left_context);range_end:=greatest(0,suffix_len-right_context);
       old_middle:=substr(old_text,range_start+1,length(old_text)-range_start-range_end);
       new_middle:=substr(new_text,range_start+1,length(new_text)-range_start-range_end);
       if length(old_middle)>0 and (length(old_text)-length(replace(old_text,old_middle,'')))/length(old_middle)=1 and (length(flow_text)-length(replace(flow_text,old_middle,'')))/length(old_middle)=1 then
        flow_text:=replace(flow_text,old_middle,new_middle);patched:=true;exit;
       end if;
      end loop;
      exit when patched;
     end loop;
     if not patched then raise exception 'Flow differs. Edit this guide in its flow to preserve generated images.' using errcode='P0002'; end if;
    end if;
    next_doc:=jsonb_set(next_doc,array['flow_data','content_markdown'],to_jsonb(flow_text));
   elsif f in ('title','short_description') then next_doc:=jsonb_set(next_doc,array['flow_data',f],to_jsonb(new_text));
   elsif f like 'cta_%_text' and jsonb_typeof(next_doc->'flow_data'->replace(f,'_text',''))='object' then next_doc:=jsonb_set(next_doc,array['flow_data',replace(f,'_text',''),'text'],to_jsonb(new_text));
   end if;
  end if;
 end loop;
 if next_doc=before_doc then raise exception 'No changes'; end if;
 route:=case p_kind when 'guides' then '/guias/' when 'tools' then '/ferramentas/' else '/premium/cursos/' end||(r->>'slug');
 insert into public.content_review_runs(kind,content_id,title,route,snapshot,row_hash,claims,status,created_by)
 values(p_kind,p_id,coalesce(r->>'title',r->>'name'),route,before_doc-'flow_data',p_expected_hash,'[]','applied',auth.uid()) returning id into review_id;
 if next_doc ? 'flow_data' then keys:=array_append(keys,'flow_data'); end if;
 select string_agg(format('%I=(jsonb_populate_record(null::public.%I,$1)).%I',k,target_table,k),',') into assignments from unnest(keys) k;
 execute format('update public.%I set %s where id=$2',target_table,assignments) using next_doc,p_id;
 execute format('select to_jsonb(t) from public.%I t where id=$1',target_table) into final_row using p_id;
 insert into public.content_review_events(run_id,kind,content_id,actor_id,before_fields,after_fields,after_hash,changes)
 values(review_id,p_kind,p_id,auth.uid(),before_doc,next_doc,public.content_review_fingerprint(p_kind,final_row),jsonb_build_object('type','manual_edit','fields',p_fields)) returning id into event_id;
 return jsonb_build_object('event_id',event_id,'run_id',review_id,'route',route,'kind',p_kind);
end $$;
revoke all on function public.content_review_save_manual(text,uuid,text,jsonb) from public,anon;
grant execute on function public.content_review_save_manual(text,uuid,text,jsonb) to authenticated;
