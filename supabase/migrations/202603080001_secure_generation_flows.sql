create table if not exists public.server_generation_tokens (
  id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  model_name text not null,
  generation_kind text not null check (generation_kind in ('image', 'audio', 'video')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists server_generation_tokens_user_expires_idx
  on public.server_generation_tokens(user_id, expires_at desc);

alter table public.server_generation_tokens enable row level security;

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

delete from public.agent_requests
where status = 'pending'
  and payment_screenshot_url is null;

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

create or replace function public.get_generation_cost(
  p_user_id uuid,
  p_model_name text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_role public.user_role;
  profile_tariff_id uuid;
  tariff_multiplier integer;
  model_base_cost integer;
begin
  select u.role, u.tariff_id
  into profile_role, profile_tariff_id
  from public.users as u
  where u.id = p_user_id;

  if profile_role is null then
    raise exception 'USER_NOT_FOUND';
  end if;

  select m.base_cost
  into model_base_cost
  from public.models as m
  where m.name = p_model_name;

  if model_base_cost is null then
    raise exception 'MODEL_NOT_FOUND';
  end if;

  if profile_tariff_id is not null then
    select t.multiplier
    into tariff_multiplier
    from public.tariffs as t
    where t.id = profile_tariff_id;
  end if;

  if tariff_multiplier is null then
    select t.multiplier
    into tariff_multiplier
    from public.tariffs as t
    where t.name = case
      when profile_role = 'agent' then 'Agent'
      else 'Regular User'
    end
    limit 1;
  end if;

  if tariff_multiplier is null then
    raise exception 'TARIFF_NOT_FOUND';
  end if;

  return greatest(1, ceil(model_base_cost::numeric * tariff_multiplier::numeric))::integer;
end;
$$;

drop function if exists public.create_generation_and_deduct(uuid, text, text, text, integer, text);
create or replace function public.create_generation_and_deduct(
  p_user_id uuid,
  p_model_name text,
  p_prompt text,
  p_aspect_ratio text,
  p_image_url text,
  p_server_token uuid
)
returns table (generation_id uuid, remaining_credits integer, charged_cost integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  wallet_credits integer;
  effective_cost integer;
  new_generation_id uuid;
  commit_token record;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if auth.uid() <> p_user_id and not public.is_admin(auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;

  select *
  into commit_token
  from public.server_generation_tokens
  where id = p_server_token
    and user_id = p_user_id
    and model_name = p_model_name
    and generation_kind = 'image'
  for update;

  if commit_token.id is null or commit_token.expires_at <= now() then
    raise exception 'INVALID_SERVER_TOKEN';
  end if;

  delete from public.server_generation_tokens
  where id = p_server_token;

  effective_cost := public.get_generation_cost(p_user_id, p_model_name);

  select w.credits
  into wallet_credits
  from public.wallets as w
  where w.user_id = p_user_id
  for update;

  if wallet_credits is null then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  if wallet_credits < effective_cost then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  update public.wallets
  set credits = credits - effective_cost
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
    effective_cost,
    p_image_url
  )
  returning id into new_generation_id;

  generation_id := new_generation_id;
  charged_cost := effective_cost;
  return next;
end;
$$;

drop function if exists public.create_audio_generation_and_deduct(uuid, text, text, integer, text);
create or replace function public.create_audio_generation_and_deduct(
  p_user_id uuid,
  p_model_name text,
  p_prompt text,
  p_audio_url text,
  p_server_token uuid
)
returns table (generation_id uuid, remaining_credits integer, charged_cost integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  wallet_credits integer;
  effective_cost integer;
  new_generation_id uuid;
  commit_token record;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if auth.uid() <> p_user_id and not public.is_admin(auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;

  select *
  into commit_token
  from public.server_generation_tokens
  where id = p_server_token
    and user_id = p_user_id
    and model_name = p_model_name
    and generation_kind = 'audio'
  for update;

  if commit_token.id is null or commit_token.expires_at <= now() then
    raise exception 'INVALID_SERVER_TOKEN';
  end if;

  delete from public.server_generation_tokens
  where id = p_server_token;

  effective_cost := public.get_generation_cost(p_user_id, p_model_name);

  select w.credits
  into wallet_credits
  from public.wallets as w
  where w.user_id = p_user_id
  for update;

  if wallet_credits is null then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  if wallet_credits < effective_cost then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  update public.wallets
  set credits = credits - effective_cost
  where user_id = p_user_id
  returning credits into remaining_credits;

  insert into public.audio_generations (user_id, model_name, prompt, cost, audio_url)
  values (p_user_id, p_model_name, p_prompt, effective_cost, p_audio_url)
  returning id into new_generation_id;

  generation_id := new_generation_id;
  charged_cost := effective_cost;
  return next;
end;
$$;

drop function if exists public.create_video_generation_and_deduct(uuid, text, text, text, text, integer, text, integer);
create or replace function public.create_video_generation_and_deduct(
  p_user_id uuid,
  p_model_name text,
  p_prompt text,
  p_image_url text,
  p_video_url text,
  p_duration integer,
  p_quality text,
  p_server_token uuid
)
returns table (generation_id uuid, remaining_credits integer, charged_cost integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  wallet_credits integer;
  effective_cost integer;
  new_generation_id uuid;
  commit_token record;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if auth.uid() <> p_user_id and not public.is_admin(auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;

  select *
  into commit_token
  from public.server_generation_tokens
  where id = p_server_token
    and user_id = p_user_id
    and model_name = p_model_name
    and generation_kind = 'video'
  for update;

  if commit_token.id is null or commit_token.expires_at <= now() then
    raise exception 'INVALID_SERVER_TOKEN';
  end if;

  delete from public.server_generation_tokens
  where id = p_server_token;

  effective_cost := public.get_generation_cost(p_user_id, p_model_name);

  select w.credits
  into wallet_credits
  from public.wallets as w
  where w.user_id = p_user_id
  for update;

  if wallet_credits is null then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  if wallet_credits < effective_cost then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  update public.wallets
  set credits = credits - effective_cost
  where user_id = p_user_id
  returning credits into remaining_credits;

  insert into public.video_generations
    (user_id, model_name, prompt, image_url, video_url, duration, quality, cost)
  values
    (p_user_id, p_model_name, p_prompt, p_image_url, p_video_url, p_duration, p_quality, effective_cost)
  returning id into new_generation_id;

  generation_id := new_generation_id;
  charged_cost := effective_cost;
  return next;
end;
$$;

update public.credit_requests
set amount = case package_key
      when 'starter' then 10000
      when 'growth' then 30000
      when 'pro' then 52500
      when 'scale' then 110000
      else amount
    end,
    amount_mnt = case package_key
      when 'starter' then 10000
      when 'growth' then 30000
      when 'pro' then 50000
      when 'scale' then 100000
      else amount_mnt
    end,
    bonus_credits = case package_key
      when 'starter' then 0
      when 'growth' then 0
      when 'pro' then 2500
      when 'scale' then 10000
      else bonus_credits
    end
where package_key in ('starter', 'growth', 'pro', 'scale');

update public.credit_requests
set amount_mnt = null
where package_key = 'legacy';

revoke all on function public.get_generation_cost(uuid, text) from public;
revoke all on function public.create_generation_and_deduct(uuid, text, text, text, text, uuid) from public;
revoke all on function public.create_audio_generation_and_deduct(uuid, text, text, text, uuid) from public;
revoke all on function public.create_video_generation_and_deduct(uuid, text, text, text, text, integer, text, uuid) from public;
revoke all on function public.process_agent_request(uuid, public.credit_request_status) from public;

grant execute on function public.create_generation_and_deduct(uuid, text, text, text, text, uuid) to authenticated;
grant execute on function public.create_audio_generation_and_deduct(uuid, text, text, text, uuid) to authenticated;
grant execute on function public.create_video_generation_and_deduct(uuid, text, text, text, text, integer, text, uuid) to authenticated;
grant execute on function public.process_agent_request(uuid, public.credit_request_status) to authenticated;
