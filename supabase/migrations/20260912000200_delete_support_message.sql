create function public.delete_support_message(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare removed integer;
begin
  perform pg_advisory_xact_lock(729401923);
  -- Keep request quotas, but invalidate codes so a deleted message cannot be recreated.
  update public.support_email_challenges
    set message_id = null, expires_at = now(), subject = null, description = null
    where message_id = p_id;
  delete from public.support_messages where id = p_id;
  get diagnostics removed = row_count;
  return removed = 1;
end;
$$;
revoke all on function public.delete_support_message(uuid) from public, anon, authenticated;
grant execute on function public.delete_support_message(uuid) to service_role;
