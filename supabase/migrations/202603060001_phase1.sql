create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('agent', 'user', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'credit_request_status') then
    create type public.credit_request_status as enum ('pending', 'approved', 'rejected');
  end if;
end
$$;

create table if not exists public.tariffs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  multiplier integer not null check (multiplier > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.models (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  base_cost integer not null check (base_cost > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role public.user_role not null default 'user',
  tariff_id uuid references public.tariffs(id),
  created_at timestamptz not null default now()
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  credits integer not null default 0 check (credits >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  model_name text not null,
  prompt text not null,
  aspect_ratio text not null check (aspect_ratio in ('1:1', '4:5', '16:9')),
  cost integer not null check (cost > 0),
  image_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.credit_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount integer not null check (amount > 0),
  status public.credit_request_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists generations_user_created_idx on public.generations(user_id, created_at desc);
create index if not exists generations_created_idx on public.generations(created_at desc);
create index if not exists credit_requests_user_created_idx on public.credit_requests(user_id, created_at desc);

insert into public.tariffs (name, multiplier)
values
  ('Agent', 6),
  ('Regular User', 10)
on conflict (name)
do update set multiplier = excluded.multiplier;

insert into public.models (name, base_cost)
values ('nanobanana', 1)
on conflict (name)
do update set base_cost = excluded.base_cost;

update public.users
set tariff_id = (
  select t.id
  from public.tariffs t
  where t.name = 'Regular User'
  limit 1
)
where tariff_id is null;

create or replace function public.is_admin(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = check_user_id
      and u.role = 'admin'
  );
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  regular_tariff_id uuid;
begin
  select id into regular_tariff_id
  from public.tariffs
  where name = 'Regular User'
  limit 1;

  insert into public.users (id, email, role, tariff_id)
  values (new.id, coalesce(new.email, ''), 'user', regular_tariff_id)
  on conflict (id)
  do update set email = excluded.email;

  insert into public.wallets (user_id, credits)
  values (new.id, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.create_generation_and_deduct(
  p_user_id uuid,
  p_model_name text,
  p_prompt text,
  p_aspect_ratio text,
  p_cost integer,
  p_image_url text
)
returns table (generation_id uuid, remaining_credits integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  wallet_credits integer;
  new_generation_id uuid;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if auth.uid() <> p_user_id and not public.is_admin(auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;

  if p_cost <= 0 then
    raise exception 'INVALID_COST';
  end if;

  select w.credits
  into wallet_credits
  from public.wallets w
  where w.user_id = p_user_id
  for update;

  if wallet_credits is null then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  if wallet_credits < p_cost then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  update public.wallets
  set credits = credits - p_cost
  where user_id = p_user_id
  returning credits into remaining_credits;

  insert into public.generations (
    user_id,
    model_name,
    prompt,
    aspect_ratio,
    cost,
    image_url
  )
  values (
    p_user_id,
    p_model_name,
    p_prompt,
    p_aspect_ratio,
    p_cost,
    p_image_url
  )
  returning id into new_generation_id;

  generation_id := new_generation_id;
  return next;
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
    update public.wallets
    set credits = credits + req.amount
    where user_id = req.user_id
    returning credits into new_balance;
  else
    select credits into new_balance
    from public.wallets
    where user_id = req.user_id;
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

alter table public.users enable row level security;
alter table public.wallets enable row level security;
alter table public.tariffs enable row level security;
alter table public.models enable row level security;
alter table public.generations enable row level security;
alter table public.credit_requests enable row level security;

drop policy if exists users_select_self_or_admin on public.users;
create policy users_select_self_or_admin
on public.users
for select
using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists users_insert_self on public.users;
create policy users_insert_self
on public.users
for insert
with check (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists users_update_admin_only on public.users;
create policy users_update_admin_only
on public.users
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists wallets_select_self_or_admin on public.wallets;
create policy wallets_select_self_or_admin
on public.wallets
for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists wallets_insert_self_or_admin on public.wallets;
create policy wallets_insert_self_or_admin
on public.wallets
for insert
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists wallets_update_admin_only on public.wallets;
create policy wallets_update_admin_only
on public.wallets
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists tariffs_select_authenticated on public.tariffs;
create policy tariffs_select_authenticated
on public.tariffs
for select
using (auth.uid() is not null);

drop policy if exists tariffs_modify_admin_only on public.tariffs;
create policy tariffs_modify_admin_only
on public.tariffs
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists models_select_authenticated on public.models;
create policy models_select_authenticated
on public.models
for select
using (auth.uid() is not null);

drop policy if exists models_modify_admin_only on public.models;
create policy models_modify_admin_only
on public.models
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists generations_select_self_or_admin on public.generations;
create policy generations_select_self_or_admin
on public.generations
for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists generations_insert_self_or_admin on public.generations;
create policy generations_insert_self_or_admin
on public.generations
for insert
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists credit_requests_select_self_or_admin on public.credit_requests;
create policy credit_requests_select_self_or_admin
on public.credit_requests
for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists credit_requests_insert_self on public.credit_requests;
create policy credit_requests_insert_self
on public.credit_requests
for insert
with check (auth.uid() = user_id);

drop policy if exists credit_requests_update_admin_only on public.credit_requests;
create policy credit_requests_update_admin_only
on public.credit_requests
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

revoke all on function public.is_admin(uuid) from public;
revoke all on function public.create_generation_and_deduct(uuid, text, text, text, integer, text) from public;
revoke all on function public.process_credit_request(uuid, public.credit_request_status) from public;

grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.create_generation_and_deduct(uuid, text, text, text, integer, text) to authenticated;
grant execute on function public.process_credit_request(uuid, public.credit_request_status) to authenticated;

