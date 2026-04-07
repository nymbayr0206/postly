alter table public.video_generations
  add column if not exists seed integer;

alter table public.video_generations
  drop constraint if exists video_generations_seed_check;

alter table public.video_generations
  add constraint video_generations_seed_check
  check (seed is null or seed between 10000 and 99999);

drop function if exists public.create_video_generation_and_deduct(uuid, text, text, text, text, integer, text, uuid);
create or replace function public.create_video_generation_and_deduct(
  p_user_id uuid,
  p_model_name text,
  p_prompt text,
  p_image_url text,
  p_video_url text,
  p_duration integer,
  p_quality text,
  p_server_token uuid,
  p_seed integer default null
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

  if p_seed is not null and (p_seed < 10000 or p_seed > 99999) then
    raise exception 'INVALID_SEED';
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
    (user_id, model_name, prompt, image_url, video_url, duration, quality, cost, seed)
  values
    (p_user_id, p_model_name, p_prompt, p_image_url, p_video_url, p_duration, p_quality, effective_cost, p_seed)
  returning id into new_generation_id;

  generation_id := new_generation_id;
  charged_cost := effective_cost;
  return next;
end;
$$;

revoke all on function public.create_video_generation_and_deduct(uuid, text, text, text, text, integer, text, uuid, integer) from public;
grant execute on function public.create_video_generation_and_deduct(uuid, text, text, text, text, integer, text, uuid, integer) to authenticated;
