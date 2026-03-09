alter table public.referral_earnings
  add column if not exists commission_amount_mnt integer not null default 0;

create table if not exists public.referral_credit_conversions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount_mnt integer not null check (amount_mnt > 0),
  credited_credits integer not null check (credited_credits > 0),
  created_at timestamptz not null default now()
);

create index if not exists referral_credit_conversions_user_created_idx
  on public.referral_credit_conversions(user_id, created_at desc);

alter table public.referral_credit_conversions enable row level security;

drop policy if exists referral_credit_conversions_select_self_or_admin on public.referral_credit_conversions;
create policy referral_credit_conversions_select_self_or_admin
on public.referral_credit_conversions
for select
using (user_id = auth.uid() or public.is_admin(auth.uid()));

create table if not exists public.referral_payout_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount_mnt integer not null check (amount_mnt > 0),
  bank_name text not null,
  account_holder text not null,
  account_number text not null,
  status public.credit_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists referral_payout_requests_user_created_idx
  on public.referral_payout_requests(user_id, created_at desc);

create index if not exists referral_payout_requests_status_created_idx
  on public.referral_payout_requests(status, created_at desc);

alter table public.referral_payout_requests enable row level security;

drop policy if exists referral_payout_requests_select_self_or_admin on public.referral_payout_requests;
create policy referral_payout_requests_select_self_or_admin
on public.referral_payout_requests
for select
using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists referral_payout_requests_insert_self_or_admin on public.referral_payout_requests;
create policy referral_payout_requests_insert_self_or_admin
on public.referral_payout_requests
for insert
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

create or replace function public.get_referral_available_balance_mnt(
  p_user_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  total_earned integer := 0;
  total_converted integer := 0;
  total_reserved integer := 0;
begin
  select coalesce(sum(re.commission_amount_mnt), 0)::integer
  into total_earned
  from public.referral_earnings as re
  where re.referrer_user_id = p_user_id;

  select coalesce(sum(rc.amount_mnt), 0)::integer
  into total_converted
  from public.referral_credit_conversions as rc
  where rc.user_id = p_user_id;

  select coalesce(sum(rp.amount_mnt), 0)::integer
  into total_reserved
  from public.referral_payout_requests as rp
  where rp.user_id = p_user_id
    and rp.status in ('pending', 'approved');

  return greatest(total_earned - total_converted - total_reserved, 0);
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
  referral_commission_mnt integer;
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

    referral_commission_mnt := floor(coalesce(req.amount_mnt, 0)::numeric * 0.10)::integer;

    if resolved_referrer_user_id is not null
       and resolved_referrer_user_id <> req.user_id
       and referral_commission_mnt > 0 then
      insert into public.referral_earnings (
        referrer_user_id,
        referred_user_id,
        credit_request_id,
        agent_request_id,
        credited_amount,
        commission_credits,
        commission_amount_mnt,
        commission_rate
      )
      values (
        resolved_referrer_user_id,
        req.user_id,
        req.id,
        null,
        coalesce(req.amount_mnt, 0),
        0,
        referral_commission_mnt,
        0.10
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

create or replace function public.process_agent_request(
  p_request_id uuid,
  p_status public.credit_request_status
)
returns table (
  request_id uuid,
  user_id uuid,
  new_status public.credit_request_status,
  new_balance integer,
  new_role public.user_role
)
language plpgsql
security definer
set search_path = public
as $$
declare
  req record;
  agent_tariff_id uuid;
  resolved_referrer_user_id uuid;
  resolved_referrer_role public.user_role;
  agent_referral_reward_mnt integer := 30000;
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;

  if p_status = 'pending' then
    raise exception 'INVALID_STATUS';
  end if;

  select *
  into req
  from public.agent_requests
  where id = p_request_id
  for update;

  if req.id is null then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if req.status <> 'pending' then
    raise exception 'ALREADY_PROCESSED';
  end if;

  if p_status = 'approved'
     and coalesce(nullif(trim(req.payment_screenshot_url), ''), '') = '' then
    raise exception 'PAYMENT_PROOF_REQUIRED';
  end if;

  if p_status = 'approved' then
    select id
    into agent_tariff_id
    from public.tariffs
    where name = 'Agent'
    limit 1;

    if agent_tariff_id is null then
      raise exception 'AGENT_TARIFF_NOT_FOUND';
    end if;

    update public.users
    set role = 'agent',
        tariff_id = agent_tariff_id
    where id = req.user_id;

    update public.wallets as w
    set credits = w.credits + 50000
    where w.user_id = req.user_id
    returning w.credits into new_balance;

    select u.referred_by_user_id
    into resolved_referrer_user_id
    from public.users as u
    where u.id = req.user_id;

    if resolved_referrer_user_id is not null
       and resolved_referrer_user_id <> req.user_id then
      select u.role
      into resolved_referrer_role
      from public.users as u
      where u.id = resolved_referrer_user_id;

      if resolved_referrer_role = 'agent' then
        insert into public.referral_earnings (
          referrer_user_id,
          referred_user_id,
          credit_request_id,
          agent_request_id,
          credited_amount,
          commission_credits,
          commission_amount_mnt,
          commission_rate
        )
        values (
          resolved_referrer_user_id,
          req.user_id,
          null,
          req.id,
          req.amount_mnt,
          0,
          agent_referral_reward_mnt,
          0.20
        )
        on conflict (agent_request_id) do nothing;
      end if;
    end if;

    new_role := 'agent';
  else
    select role
    into new_role
    from public.users as u
    where u.id = req.user_id;

    select credits
    into new_balance
    from public.wallets as w
    where w.user_id = req.user_id;
  end if;

  update public.agent_requests
  set status = p_status,
      updated_at = now()
  where id = p_request_id;

  request_id := req.id;
  user_id := req.user_id;
  new_status := p_status;
  return next;
end;
$$;

drop function if exists public.get_referral_summary(uuid);

create function public.get_referral_summary(
  p_user_id uuid
)
returns table (
  invited_users integer,
  reward_events integer,
  earned_amount_mnt integer,
  available_amount_mnt integer,
  pending_payout_amount_mnt integer,
  paid_out_amount_mnt integer,
  converted_amount_mnt integer
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
        and re.commission_amount_mnt > 0
    ), 0) as reward_events,
    coalesce((
      select sum(re.commission_amount_mnt)::integer
      from public.referral_earnings as re
      where re.referrer_user_id = p_user_id
    ), 0) as earned_amount_mnt,
    public.get_referral_available_balance_mnt(p_user_id) as available_amount_mnt,
    coalesce((
      select sum(rp.amount_mnt)::integer
      from public.referral_payout_requests as rp
      where rp.user_id = p_user_id
        and rp.status = 'pending'
    ), 0) as pending_payout_amount_mnt,
    coalesce((
      select sum(rp.amount_mnt)::integer
      from public.referral_payout_requests as rp
      where rp.user_id = p_user_id
        and rp.status = 'approved'
    ), 0) as paid_out_amount_mnt,
    coalesce((
      select sum(rc.amount_mnt)::integer
      from public.referral_credit_conversions as rc
      where rc.user_id = p_user_id
    ), 0) as converted_amount_mnt;
end;
$$;

create or replace function public.convert_referral_balance_to_credits(
  p_amount_mnt integer
)
returns table (
  debited_amount_mnt integer,
  credited_credits integer,
  remaining_amount_mnt integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  available_amount integer;
  credit_price_mnt integer;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if p_amount_mnt is null or p_amount_mnt <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  available_amount := public.get_referral_available_balance_mnt(auth.uid());

  if p_amount_mnt > available_amount then
    raise exception 'INSUFFICIENT_REFERRAL_BALANCE';
  end if;

  select greatest(coalesce(ps.credit_price_mnt, 10), 1)
  into credit_price_mnt
  from public.platform_settings as ps
  limit 1;

  credit_price_mnt := coalesce(credit_price_mnt, 10);
  credited_credits := floor(p_amount_mnt::numeric / credit_price_mnt)::integer;

  if credited_credits <= 0 then
    raise exception 'AMOUNT_TOO_SMALL';
  end if;

  debited_amount_mnt := credited_credits * credit_price_mnt;

  insert into public.referral_credit_conversions (user_id, amount_mnt, credited_credits)
  values (auth.uid(), debited_amount_mnt, credited_credits);

  update public.wallets as w
  set credits = w.credits + credited_credits
  where w.user_id = auth.uid();

  remaining_amount_mnt := public.get_referral_available_balance_mnt(auth.uid());
  return next;
end;
$$;

create or replace function public.create_referral_payout_request(
  p_amount_mnt integer,
  p_bank_name text,
  p_account_holder text,
  p_account_number text
)
returns table (
  request_id uuid,
  remaining_amount_mnt integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  available_amount integer;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if p_amount_mnt is null or p_amount_mnt <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if coalesce(trim(p_bank_name), '') = ''
     or coalesce(trim(p_account_holder), '') = ''
     or coalesce(trim(p_account_number), '') = '' then
    raise exception 'BANK_DETAILS_REQUIRED';
  end if;

  available_amount := public.get_referral_available_balance_mnt(auth.uid());

  if p_amount_mnt > available_amount then
    raise exception 'INSUFFICIENT_REFERRAL_BALANCE';
  end if;

  insert into public.referral_payout_requests (
    user_id,
    amount_mnt,
    bank_name,
    account_holder,
    account_number
  )
  values (
    auth.uid(),
    p_amount_mnt,
    trim(p_bank_name),
    trim(p_account_holder),
    trim(p_account_number)
  )
  returning id into request_id;

  remaining_amount_mnt := public.get_referral_available_balance_mnt(auth.uid());
  return next;
end;
$$;

create or replace function public.process_referral_payout_request(
  p_request_id uuid,
  p_status public.credit_request_status
)
returns table (
  request_id uuid,
  user_id uuid,
  new_status public.credit_request_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  req record;
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;

  if p_status = 'pending' then
    raise exception 'INVALID_STATUS';
  end if;

  select *
  into req
  from public.referral_payout_requests
  where id = p_request_id
  for update;

  if req.id is null then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if req.status <> 'pending' then
    raise exception 'ALREADY_PROCESSED';
  end if;

  update public.referral_payout_requests
  set status = p_status,
      updated_at = now()
  where id = p_request_id;

  request_id := req.id;
  user_id := req.user_id;
  new_status := p_status;
  return next;
end;
$$;

grant execute on function public.get_referral_available_balance_mnt(uuid) to authenticated;
grant execute on function public.get_referral_summary(uuid) to authenticated;
grant execute on function public.convert_referral_balance_to_credits(integer) to authenticated;
grant execute on function public.create_referral_payout_request(integer, text, text, text) to authenticated;
grant execute on function public.process_referral_payout_request(uuid, public.credit_request_status) to authenticated;
