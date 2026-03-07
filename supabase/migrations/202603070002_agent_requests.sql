create table if not exists public.agent_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  amount_mnt integer not null default 150000 check (amount_mnt > 0),
  payment_screenshot_url text,
  status public.credit_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_requests_user_created_idx
  on public.agent_requests(user_id, created_at desc);

create index if not exists agent_requests_status_created_idx
  on public.agent_requests(status, created_at desc);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  regular_tariff_id uuid;
  requested_role text;
begin
  select id into regular_tariff_id
  from public.tariffs
  where name = 'Regular User'
  limit 1;

  requested_role := coalesce(new.raw_user_meta_data ->> 'requested_role', 'user');

  insert into public.users (id, email, role, tariff_id)
  values (new.id, coalesce(new.email, ''), 'user', regular_tariff_id)
  on conflict (id)
  do update set email = excluded.email;

  insert into public.wallets (user_id, credits)
  values (new.id, 0)
  on conflict (user_id) do nothing;

  if requested_role = 'agent' then
    insert into public.agent_requests (user_id, amount_mnt, status)
    values (new.id, 150000, 'pending')
    on conflict (user_id) do nothing;
  end if;

  return new;
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

alter table public.agent_requests enable row level security;

drop policy if exists agent_requests_select_self_or_admin on public.agent_requests;
create policy agent_requests_select_self_or_admin
on public.agent_requests
for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists agent_requests_insert_self_or_admin on public.agent_requests;
create policy agent_requests_insert_self_or_admin
on public.agent_requests
for insert
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists agent_requests_update_self_or_admin on public.agent_requests;
create policy agent_requests_update_self_or_admin
on public.agent_requests
for update
using (auth.uid() = user_id or public.is_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

revoke all on function public.process_agent_request(uuid, public.credit_request_status) from public;
grant execute on function public.process_agent_request(uuid, public.credit_request_status) to authenticated;
