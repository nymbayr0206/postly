alter table public.video_generations
  add column if not exists provider_task_id text;

alter table public.video_generations
  add column if not exists parent_generation_id uuid references public.video_generations(id) on delete set null;

create index if not exists video_generations_parent_created_idx
  on public.video_generations(parent_generation_id, created_at desc);

create index if not exists video_generations_provider_task_idx
  on public.video_generations(provider_task_id)
  where provider_task_id is not null;

drop function if exists public.create_video_generation_and_deduct(uuid, text, text, text, text, integer, text, uuid, integer);
create or replace function public.create_video_generation_and_deduct(
  p_user_id uuid,
  p_model_name text,
  p_prompt text,
  p_image_url text,
  p_video_url text,
  p_duration integer,
  p_quality text,
  p_server_token uuid,
  p_seed integer default null,
  p_provider_task_id text default null,
  p_parent_generation_id uuid default null
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
  parent_generation_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if auth.uid() <> p_user_id and not public.is_admin(auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;

  if p_seed is not null and (p_seed < 10000 or p_seed > 99999) then
    raise exception 'INVALID_SEED';
  end if;

  if p_parent_generation_id is not null then
    select vg.user_id
    into parent_generation_owner
    from public.video_generations as vg
    where vg.id = p_parent_generation_id;

    if parent_generation_owner is null or parent_generation_owner <> p_user_id then
      raise exception 'INVALID_PARENT_GENERATION';
    end if;
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
    (
      user_id,
      model_name,
      prompt,
      image_url,
      video_url,
      duration,
      quality,
      cost,
      seed,
      provider_task_id,
      parent_generation_id
    )
  values
    (
      p_user_id,
      p_model_name,
      p_prompt,
      p_image_url,
      p_video_url,
      p_duration,
      p_quality,
      effective_cost,
      p_seed,
      nullif(trim(p_provider_task_id), ''),
      p_parent_generation_id
    )
  returning id into new_generation_id;

  generation_id := new_generation_id;
  charged_cost := effective_cost;
  return next;
end;
$$;

revoke all on function public.create_video_generation_and_deduct(uuid, text, text, text, text, integer, text, uuid, integer, text, uuid) from public;
grant execute on function public.create_video_generation_and_deduct(uuid, text, text, text, text, integer, text, uuid, integer, text, uuid) to authenticated;
