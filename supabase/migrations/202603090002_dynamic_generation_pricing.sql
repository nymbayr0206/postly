alter table public.server_generation_tokens
  add column if not exists charged_cost integer;

update public.server_generation_tokens
set charged_cost = coalesce(charged_cost, 1)
where charged_cost is null;

alter table public.server_generation_tokens
  alter column charged_cost set not null;

alter table public.server_generation_tokens
  add constraint server_generation_tokens_charged_cost_positive
  check (charged_cost > 0);

update public.models
set base_cost = case name
  when 'nano-banana-2' then 8
  when 'nanobanana' then 8
  when 'elevenlabs/text-to-dialogue-v3' then 14
  when 'runway/gen4-turbo' then 12
  else base_cost
end
where name in ('nano-banana-2', 'nanobanana', 'elevenlabs/text-to-dialogue-v3', 'runway/gen4-turbo');

drop function if exists public.create_generation_and_deduct(uuid, text, text, text, text, uuid);
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

  effective_cost := commit_token.charged_cost;

  delete from public.server_generation_tokens
  where id = p_server_token;

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

drop function if exists public.create_audio_generation_and_deduct(uuid, text, text, text, uuid);
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

  effective_cost := commit_token.charged_cost;

  delete from public.server_generation_tokens
  where id = p_server_token;

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

drop function if exists public.create_video_generation_and_deduct(uuid, text, text, text, text, integer, text, uuid);
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

  effective_cost := commit_token.charged_cost;

  delete from public.server_generation_tokens
  where id = p_server_token;

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

revoke all on function public.create_generation_and_deduct(uuid, text, text, text, text, uuid) from public;
revoke all on function public.create_audio_generation_and_deduct(uuid, text, text, text, uuid) from public;
revoke all on function public.create_video_generation_and_deduct(uuid, text, text, text, text, integer, text, uuid) from public;

grant execute on function public.create_generation_and_deduct(uuid, text, text, text, text, uuid) to authenticated;
grant execute on function public.create_audio_generation_and_deduct(uuid, text, text, text, uuid) to authenticated;
grant execute on function public.create_video_generation_and_deduct(uuid, text, text, text, text, integer, text, uuid) to authenticated;
