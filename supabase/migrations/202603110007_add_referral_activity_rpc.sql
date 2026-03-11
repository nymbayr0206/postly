create or replace function public.get_referral_activity(
  p_user_id uuid
)
returns table (
  referred_user_id uuid,
  referred_user_email text,
  referred_user_role public.user_role,
  joined_at timestamptz,
  reward_events integer,
  earned_amount_mnt integer,
  last_reward_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if auth.uid() <> p_user_id and not public.is_admin(auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select
    u.id as referred_user_id,
    u.email as referred_user_email,
    u.role as referred_user_role,
    u.created_at as joined_at,
    coalesce(count(re.id), 0)::integer as reward_events,
    coalesce(sum(re.commission_amount_mnt), 0)::integer as earned_amount_mnt,
    max(re.created_at) as last_reward_at
  from public.users as u
  left join public.referral_earnings as re
    on re.referred_user_id = u.id
   and re.referrer_user_id = p_user_id
  where u.referred_by_user_id = p_user_id
  group by u.id, u.email, u.role, u.created_at
  order by u.created_at desc;
end;
$$;

grant execute on function public.get_referral_activity(uuid) to authenticated;
