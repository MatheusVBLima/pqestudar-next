begin;
do $$
declare challenge uuid := gen_random_uuid(); message uuid; answer jsonb;
begin
  perform public.request_support_code(challenge,'delete-support-test@example.test','Teste de exclusao','Mensagem temporaria para testar exclusao.',repeat('9',64),repeat('8',64));
  answer := public.confirm_support_code(challenge,repeat('8',64));
  message := (answer->>'id')::uuid;
  if message is null then raise exception 'Fixture failed'; end if;
  if not public.delete_support_message(message) then raise exception 'Delete failed'; end if;
  if exists(select 1 from public.support_messages where id=message) then raise exception 'Message retained'; end if;
  answer := public.confirm_support_code(challenge,repeat('8',64));
  if answer->>'error' is distinct from 'expired_code' then raise exception 'Deleted message can be replayed'; end if;
  if public.delete_support_message(message) then raise exception 'Missing message reported as deleted'; end if;
  if has_function_privilege('anon','public.delete_support_message(uuid)','execute') or has_function_privilege('authenticated','public.delete_support_message(uuid)','execute') then raise exception 'Public delete access'; end if;
  -- Legacy messages without challenges are deletable too.
  insert into public.support_messages(email,subject,description,origin_hash) values ('legacy-test@example.test','Teste legado','Mensagem antiga para exclusao.',repeat('7',64)) returning id into message;
  if not public.delete_support_message(message) then raise exception 'Legacy delete failed'; end if;
end $$;
rollback;
