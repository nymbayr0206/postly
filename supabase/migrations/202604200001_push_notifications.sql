create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  device_platform text,
  app_installed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists push_subscriptions_user_updated_idx
  on public.push_subscriptions (user_id, updated_at desc)
  where user_id is not null;

create or replace function public.set_push_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists on_push_subscriptions_set_updated_at on public.push_subscriptions;
create trigger on_push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row execute function public.set_push_subscriptions_updated_at();

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select_self_or_admin on public.push_subscriptions;
create policy push_subscriptions_select_self_or_admin
on public.push_subscriptions
for select
to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists push_subscriptions_insert_self_or_admin on public.push_subscriptions;
create policy push_subscriptions_insert_self_or_admin
on public.push_subscriptions
for insert
to authenticated
with check (
  user_id = auth.uid()
  or (user_id is null and public.is_admin(auth.uid()))
  or public.is_admin(auth.uid())
);

drop policy if exists push_subscriptions_update_self_or_admin on public.push_subscriptions;
create policy push_subscriptions_update_self_or_admin
on public.push_subscriptions
for update
to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()))
with check (
  user_id = auth.uid()
  or (user_id is null and public.is_admin(auth.uid()))
  or public.is_admin(auth.uid())
);

drop policy if exists push_subscriptions_delete_self_or_admin on public.push_subscriptions;
create policy push_subscriptions_delete_self_or_admin
on public.push_subscriptions
for delete
to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()));

revoke all on public.push_subscriptions from anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;
