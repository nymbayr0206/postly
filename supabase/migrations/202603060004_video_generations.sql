-- Add Runway model
insert into public.models (name, base_cost)
values ('runway/gen4-turbo', 1)
on conflict (name)
do update set base_cost = excluded.base_cost;

-- Video generations table
create table if not exists public.video_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  model_name text not null,
  prompt text not null,
  image_url text not null,
  video_url text not null,
  duration integer not null default 5,
  quality text not null default '720p',
  cost integer not null check (cost > 0),
  created_at timestamptz not null default now()
);

create index if not exists video_generations_user_created_idx
  on public.video_generations(user_id, created_at desc);

alter table public.video_generations enable row level security;

drop policy if exists video_generations_select_self_or_admin on public.video_generations;
create policy video_generations_select_self_or_admin
on public.video_generations for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists video_generations_insert_self_or_admin on public.video_generations;
create policy video_generations_insert_self_or_admin
on public.video_generations for insert
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

-- Atomic deduct + record function for video
create or replace function public.create_video_generation_and_deduct(
  p_user_id uuid,
  p_model_name text,
  p_prompt text,
  p_image_url text,
  p_video_url text,
  p_duration integer,
  p_quality text,
  p_cost integer
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
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  if auth.uid() <> p_user_id and not public.is_admin(auth.uid()) then raise exception 'FORBIDDEN'; end if;
  if p_cost <= 0 then raise exception 'INVALID_COST'; end if;

  select w.credits into wallet_credits
  from public.wallets w where w.user_id = p_user_id for update;

  if wallet_credits is null then raise exception 'WALLET_NOT_FOUND'; end if;
  if wallet_credits < p_cost then raise exception 'INSUFFICIENT_CREDITS'; end if;

  update public.wallets set credits = credits - p_cost
  where user_id = p_user_id returning credits into remaining_credits;

  insert into public.video_generations
    (user_id, model_name, prompt, image_url, video_url, duration, quality, cost)
  values
    (p_user_id, p_model_name, p_prompt, p_image_url, p_video_url, p_duration, p_quality, p_cost)
  returning id into new_generation_id;

  generation_id := new_generation_id;
  return next;
end;
$$;

revoke all on function public.create_video_generation_and_deduct(uuid,text,text,text,text,integer,text,integer) from public;
grant execute on function public.create_video_generation_and_deduct(uuid,text,text,text,text,integer,text,integer) to authenticated;
