begin;
do $$
declare challenge uuid := gen_random_uuid(); resend uuid := gen_random_uuid(); answer jsonb; message uuid; i integer;
begin
  answer := public.request_support_code(challenge,'otp-test@example.test','Assunto de teste','Descricao de teste de suporte',repeat('a',64),repeat('b',64));
  if answer->>'id' is null then raise exception 'Request failed: %',answer; end if;
  if exists(select 1 from public.support_messages where email='otp-test@example.test') then raise exception 'Message created before verification'; end if;
  answer := public.request_support_code(gen_random_uuid(),'other-otp@example.test','Assunto','Descricao de teste de suporte',repeat('a',64),repeat('b',64));
  if answer->>'error' is distinct from 'rate_limit' then raise exception 'Origin request cooldown bypass'; end if;
  answer := public.request_support_code(gen_random_uuid(),'OTP-TEST@example.test','Assunto','Descricao de teste de suporte',repeat('c',64),repeat('b',64));
  if answer->>'error' is distinct from 'rate_limit' then raise exception 'Email request cooldown bypass'; end if;
  for i in 1..5 loop
    answer := public.confirm_support_code(challenge,repeat('c',64));
  end loop;
  if answer->>'error' is distinct from 'locked_code' then raise exception 'Attempt limit failed'; end if;
  if (select attempts from public.support_email_challenges where id=challenge) <> 5 then raise exception 'Failed attempts rolled back'; end if;
  answer := public.confirm_support_code(challenge,repeat('b',64));
  if answer->>'error' is distinct from 'locked_code' then raise exception 'Locked code accepted'; end if;
  update public.support_email_challenges set created_at=now()-interval '2 minutes' where id=challenge;
  answer := public.request_support_code(resend,'otp-test@example.test','Assunto de teste','Descricao de teste de suporte',repeat('a',64),repeat('d',64));
  if answer->>'id' is null then raise exception 'Resend failed'; end if;
  answer := public.confirm_support_code(challenge,repeat('b',64));
  if answer->>'error' is distinct from 'expired_code' then raise exception 'Old code valid after resend'; end if;
  answer := public.confirm_support_code(resend,repeat('d',64));
  message := (answer->>'id')::uuid;
  if message is null then raise exception 'Valid code failed: %',answer; end if;
  if not exists(select 1 from public.support_messages where id=message and email_verified_at is not null and subject='Assunto de teste') then raise exception 'Verified message missing'; end if;
  answer := public.confirm_support_code(resend,repeat('d',64));
  if (answer->>'id')::uuid is distinct from message then raise exception 'Replay not idempotent'; end if;
  if (select count(*) from public.support_messages where email='otp-test@example.test') <> 1 then raise exception 'Duplicate message'; end if;
  update public.support_email_challenges set expires_at=now()-interval '1 second' where id=resend;
  answer := public.confirm_support_code(resend,repeat('d',64));
  if answer->>'error' is distinct from 'expired_code' then raise exception 'Expired code accepted'; end if;
  -- 48-hour request ceiling survives a new address from the same origin.
  insert into public.support_email_challenges(id,email,subject,description,origin_hash,code_hash,created_at)
    select gen_random_uuid(),'quota-otp@example.test','Assunto','Descricao de teste',repeat('f',64),repeat('b',64),now()-interval '2 hours' from generate_series(1,10);
  answer := public.request_support_code(gen_random_uuid(),'new-otp@example.test','Assunto','Descricao de teste',repeat('f',64),repeat('b',64));
  if answer->>'error' is distinct from 'rate_limit' then raise exception '48-hour origin quota bypass'; end if;
  answer := public.request_support_code(gen_random_uuid(),'quota-otp@example.test','Assunto','Descricao de teste',repeat('e',64),repeat('b',64));
  if answer->>'error' is distinct from 'rate_limit' then raise exception '48-hour email quota bypass'; end if;
  if has_function_privilege('anon','public.request_support_code(uuid,text,text,text,text,text)','execute') or has_function_privilege('authenticated','public.confirm_support_code(uuid,text)','execute') then raise exception 'Public verification RPC access'; end if;
  if has_table_privilege('authenticated','public.support_email_challenges','select') or has_table_privilege('anon','public.support_email_challenges','select') then raise exception 'Challenge data exposed'; end if;
end $$;
rollback;
