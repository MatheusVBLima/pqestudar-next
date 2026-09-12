begin;
do $$
declare i integer; blocked boolean := false;
begin
  perform public.submit_support_message('support-test@example.test','Teste','Mensagem de teste de suporte',repeat('a',64));
  begin
    perform public.submit_support_message('other@example.test','Teste','Mensagem de teste de suporte',repeat('a',64));
  exception when raise_exception then blocked := sqlerrm = 'support_rate_limit'; end;
  if not blocked then raise exception 'Origin cooldown bypass'; end if;
  blocked := false;
  begin
    perform public.submit_support_message('SUPPORT-TEST@example.test','Teste','Mensagem de teste de suporte',repeat('b',64));
  exception when raise_exception then blocked := sqlerrm = 'support_rate_limit'; end;
  if not blocked then raise exception 'Email cooldown bypass'; end if;
  for i in 2..5 loop
    update public.support_messages set created_at = now() - interval '2 minutes' where email = 'support-test@example.test';
    perform public.submit_support_message('support-test@example.test','Teste','Mensagem de teste de suporte',repeat('a',64));
  end loop;
  update public.support_messages set created_at = now() - interval '2 minutes' where email = 'support-test@example.test';
  blocked := false;
  begin
    perform public.submit_support_message('support-test@example.test','Teste','Mensagem de teste de suporte',repeat('b',64));
  exception when raise_exception then blocked := sqlerrm = 'support_rate_limit'; end;
  if not blocked then raise exception 'Email 48h limit bypass'; end if;
  blocked := false;
  begin
    perform public.submit_support_message('other@example.test','Teste','Mensagem de teste de suporte',repeat('a',64));
  exception when raise_exception then blocked := sqlerrm = 'support_rate_limit'; end;
  if not blocked then raise exception 'Origin 48h limit bypass'; end if;
  update public.support_messages set created_at = now() - interval '49 hours' where email = 'support-test@example.test';
  perform public.submit_support_message('support-test@example.test','Teste','Mensagem de teste de suporte',repeat('a',64));
  if has_function_privilege('anon','public.submit_support_message(text,text,text,text)','EXECUTE') or has_function_privilege('authenticated','public.submit_support_message(text,text,text,text)','EXECUTE') then raise exception 'Public RPC access'; end if;
  if has_table_privilege('anon','public.support_messages','SELECT') or has_table_privilege('authenticated','public.support_messages','INSERT') then raise exception 'Public table access'; end if;
end $$;
set local role authenticated;
do $$ begin
  if exists(select 1 from public.support_messages) then raise exception 'Non-admin can read messages'; end if;
end $$;
reset role;
rollback;
