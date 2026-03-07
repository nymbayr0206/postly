-- Insert both models (nano-banana-2 was added in previous migration, keeping idempotent)
insert into public.models (name, base_cost)
values
  ('nano-banana-2', 1),
  ('elevenlabs/text-to-dialogue-v3', 1)
on conflict (name)
do update set base_cost = excluded.base_cost;

-- Audio generations table
create table if not exists public.audio_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  model_name text not null,
  prompt text not null,
  cost integer not null check (cost > 0),
  audio_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists audio_generations_user_created_idx
  on public.audio_generations(user_id, created_at desc);

-- RLS
alter table public.audio_generations enable row level security;

drop policy if exists audio_generations_select_self_or_admin on public.audio_generations;
create policy audio_generations_select_self_or_admin
on public.audio_generations
for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists audio_generations_insert_self_or_admin on public.audio_generations;
create policy audio_generations_insert_self_or_admin
on public.audio_generations
for insert
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

-- Atomic deduct + record function for audio
create or replace function public.create_audio_generation_and_deduct(
  p_user_id uuid,
  p_model_name text,
  p_prompt text,
  p_cost integer,
  p_audio_url text
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

  insert into public.audio_generations (user_id, model_name, prompt, cost, audio_url)
  values (p_user_id, p_model_name, p_prompt, p_cost, p_audio_url)
  returning id into new_generation_id;

  generation_id := new_generation_id;
  return next;
end;
$$;

revoke all on function public.create_audio_generation_and_deduct(uuid, text, text, integer, text) from public;
grant execute on function public.create_audio_generation_and_deduct(uuid, text, text, integer, text) to authenticated;
