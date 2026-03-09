create table if not exists public.platform_settings (
  id boolean primary key default true check (id = true),
  credit_price_mnt integer not null check (credit_price_mnt > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (id, credit_price_mnt)
values (true, 10)
on conflict (id) do nothing;

alter table public.platform_settings enable row level security;

drop policy if exists platform_settings_select_authenticated on public.platform_settings;
create policy platform_settings_select_authenticated
on public.platform_settings
for select
using (auth.role() = 'authenticated');

drop policy if exists platform_settings_update_admin on public.platform_settings;
create policy platform_settings_update_admin
on public.platform_settings
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists platform_settings_insert_admin on public.platform_settings;
create policy platform_settings_insert_admin
on public.platform_settings
for insert
with check (public.is_admin(auth.uid()));
