alter table public.users
  add column if not exists full_name text,
  add column if not exists phone_number text,
  add column if not exists facebook_page_url text;

update public.users as u
set
  full_name = coalesce(
    u.full_name,
    nullif(trim(coalesce(au.raw_user_meta_data ->> 'full_name', '')), '')
  ),
  phone_number = coalesce(
    u.phone_number,
    nullif(trim(coalesce(au.raw_user_meta_data ->> 'phone_number', '')), '')
  ),
  facebook_page_url = coalesce(
    u.facebook_page_url,
    nullif(trim(coalesce(au.raw_user_meta_data ->> 'facebook_page_url', '')), '')
  )
from auth.users as au
where au.id = u.id;

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
  requested_full_name text;
  requested_phone_number text;
  requested_facebook_page_url text;
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
  requested_full_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  requested_phone_number := nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone_number', '')), '');
  requested_facebook_page_url := nullif(trim(coalesce(new.raw_user_meta_data ->> 'facebook_page_url', '')), '');

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

  insert into public.users (
    id,
    email,
    role,
    tariff_id,
    full_name,
    phone_number,
    facebook_page_url,
    referral_code,
    referred_by_user_id
  )
  values (
    new.id,
    coalesce(new.email, ''),
    'user',
    regular_tariff_id,
    requested_full_name,
    requested_phone_number,
    requested_facebook_page_url,
    public.generate_referral_code(),
    case
      when resolved_referrer_user_id = new.id then null
      else resolved_referrer_user_id
    end
  )
  on conflict (id)
  do update set
    email = excluded.email,
    full_name = coalesce(public.users.full_name, excluded.full_name),
    phone_number = coalesce(public.users.phone_number, excluded.phone_number),
    facebook_page_url = coalesce(public.users.facebook_page_url, excluded.facebook_page_url),
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
