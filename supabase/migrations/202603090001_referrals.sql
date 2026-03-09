create or replace function public.generate_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_code text;
begin
  perform pg_advisory_xact_lock(9012501);

  loop
    generated_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

    exit when not exists (
      select 1
      from public.users as u
      where u.referral_code = generated_code
    );
  end loop;

  return generated_code;
end;
$$;

alter table public.users
  add column if not exists referral_code text,
  add column if not exists referred_by_user_id uuid references public.users(id) on delete set null;

update public.users
set referral_code = upper(substr(replace(id::text, '-', ''), 1, 12))
where referral_code is null
   or trim(referral_code) = '';

alter table public.users
  alter column referral_code set default public.generate_referral_code();

alter table public.users
  alter column referral_code set not null;

create unique index if not exists users_referral_code_key
  on public.users(referral_code);

create index if not exists users_referred_by_user_id_idx
  on public.users(referred_by_user_id);

create table if not exists public.referral_earnings (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.users(id) on delete cascade,
  referred_user_id uuid not null references public.users(id) on delete cascade,
  credit_request_id uuid not null unique references public.credit_requests(id) on delete cascade,
  credited_amount integer not null check (credited_amount > 0),
  commission_credits integer not null check (commission_credits >= 0),
  commission_rate numeric(5,4) not null default 0.0500,
  created_at timestamptz not null default now()
);

create index if not exists referral_earnings_referrer_idx
  on public.referral_earnings(referrer_user_id, created_at desc);

create index if not exists referral_earnings_referred_idx
  on public.referral_earnings(referred_user_id, created_at desc);

alter table public.referral_earnings enable row level security;

drop policy if exists referral_earnings_select_self_or_admin on public.referral_earnings;
create policy referral_earnings_select_self_or_admin
on public.referral_earnings
for select
using (referrer_user_id = auth.uid() or public.is_admin(auth.uid()));

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  regular_tariff_id uuid;
  requested_referral_code text;
  resolved_referrer_user_id uuid;
begin
  select id into regular_tariff_id
  from public.tariffs
  where name = 'Regular User'
  limit 1;

  requested_referral_code := upper(trim(coalesce(new.raw_user_meta_data ->> 'referral_code', '')));

  if requested_referral_code <> '' then
    select u.id
    into resolved_referrer_user_id
    from public.users as u
    where u.referral_code = requested_referral_code
    limit 1;
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
  values (new.id, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.process_credit_request(
  p_request_id uuid,
  p_status public.credit_request_status
)
returns table (
  request_id uuid,
  user_id uuid,
  new_status public.credit_request_status,
  new_balance integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  req record;
  resolved_referrer_user_id uuid;
  referral_commission integer;
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;

  if p_status = 'pending' then
    raise exception 'INVALID_STATUS';
  end if;

  select *
  into req
  from public.credit_requests
  where id = p_request_id
  for update;

  if req.id is null then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if req.status <> 'pending' then
    raise exception 'ALREADY_PROCESSED';
  end if;

  if p_status = 'approved' then
    update public.wallets as w
    set credits = w.credits + req.amount
    where w.user_id = req.user_id
    returning w.credits into new_balance;

    select u.referred_by_user_id
    into resolved_referrer_user_id
    from public.users as u
    where u.id = req.user_id;

    referral_commission := floor(req.amount::numeric * 0.05)::integer;

    if resolved_referrer_user_id is not null and referral_commission > 0 then
      update public.wallets as w
      set credits = w.credits + referral_commission
      where w.user_id = resolved_referrer_user_id;

      insert into public.referral_earnings (
        referrer_user_id,
        referred_user_id,
        credit_request_id,
        credited_amount,
        commission_credits,
        commission_rate
      )
      values (
        resolved_referrer_user_id,
        req.user_id,
        req.id,
        req.amount,
        referral_commission,
        0.05
      )
      on conflict (credit_request_id) do nothing;
    end if;
  else
    select w.credits into new_balance
    from public.wallets as w
    where w.user_id = req.user_id;
  end if;

  update public.credit_requests
  set status = p_status
  where id = p_request_id;

  request_id := req.id;
  user_id := req.user_id;
  new_status := p_status;
  return next;
end;
$$;

create or replace function public.get_referral_summary(
  p_user_id uuid
)
returns table (
  invited_users integer,
  approved_topups integer,
  earned_credits integer
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
    coalesce((
      select count(*)::integer
      from public.users as u
      where u.referred_by_user_id = p_user_id
    ), 0) as invited_users,
    coalesce((
      select count(*)::integer
      from public.referral_earnings as re
      where re.referrer_user_id = p_user_id
    ), 0) as approved_topups,
    coalesce((
      select sum(re.commission_credits)::integer
      from public.referral_earnings as re
      where re.referrer_user_id = p_user_id
    ), 0) as earned_credits;
end;
$$;

grant execute on function public.get_referral_summary(uuid) to authenticated;
