create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  regular_tariff_id uuid;
  requested_role text;
  requested_referral_code text;
  resolved_referrer_user_id uuid;
  reward_credit_price_mnt integer;
  referral_signup_bonus_credits integer := 0;
begin
  select id into regular_tariff_id
  from public.tariffs
  where name = 'Regular User'
  limit 1;

  requested_role := coalesce(new.raw_user_meta_data ->> 'requested_role', 'user');
  requested_referral_code := upper(trim(coalesce(new.raw_user_meta_data ->> 'referral_code', '')));

  if requested_referral_code <> '' then
    select u.id
    into resolved_referrer_user_id
    from public.users as u
    where u.referral_code = requested_referral_code
    limit 1;
  end if;

  if requested_role <> 'agent'
     and resolved_referrer_user_id is not null
     and resolved_referrer_user_id <> new.id then
    select greatest(coalesce(ps.credit_price_mnt, 10), 1)
    into reward_credit_price_mnt
    from public.platform_settings as ps
    limit 1;

    reward_credit_price_mnt := coalesce(reward_credit_price_mnt, 10);
    referral_signup_bonus_credits := greatest(1, floor(5000::numeric / reward_credit_price_mnt)::integer);
  end if;

  insert into public.users (id, email, role, tariff_id, referral_code, referred_by_user_id)
  values (
    new.id,
    coalesce(new.email, ''),
    'user',
    regular_tariff_id,
    public.generate_referral_code(),
    case
      when resolved_referrer_user_id = new.id then null
      else resolved_referrer_user_id
    end
  )
  on conflict (id)
  do update set
    email = excluded.email,
    referred_by_user_id = coalesce(public.users.referred_by_user_id, excluded.referred_by_user_id);

  insert into public.wallets (user_id, credits)
  values (new.id, referral_signup_bonus_credits)
  on conflict (user_id) do nothing;

  if requested_role = 'agent' then
    insert into public.agent_requests (user_id, amount_mnt, status)
    values (new.id, 150000, 'pending')
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;
