create table if not exists public.community_gallery_items (
  generation_id uuid primary key references public.generations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  creator_email text not null,
  creator_role public.user_role not null,
  prompt text not null,
  aspect_ratio text not null,
  cost integer not null check (cost > 0),
  image_url text not null,
  created_at timestamptz not null
);

create index if not exists community_gallery_items_created_idx
  on public.community_gallery_items (created_at desc);

create index if not exists community_gallery_items_user_created_idx
  on public.community_gallery_items (user_id, created_at desc);

create or replace function public.sync_community_gallery_item(p_generation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.community_gallery_items (
    generation_id,
    user_id,
    creator_email,
    creator_role,
    prompt,
    aspect_ratio,
    cost,
    image_url,
    created_at
  )
  select
    g.id,
    g.user_id,
    u.email,
    u.role,
    g.prompt,
    g.aspect_ratio,
    g.cost,
    g.image_url,
    g.created_at
  from public.generations as g
  join public.users as u
    on u.id = g.user_id
  where g.id = p_generation_id
  on conflict (generation_id)
  do update set
    user_id = excluded.user_id,
    creator_email = excluded.creator_email,
    creator_role = excluded.creator_role,
    prompt = excluded.prompt,
    aspect_ratio = excluded.aspect_ratio,
    cost = excluded.cost,
    image_url = excluded.image_url,
    created_at = excluded.created_at;
end;
$$;

create or replace function public.handle_generation_gallery_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_community_gallery_item(new.id);
  return new;
end;
$$;

drop trigger if exists on_generation_gallery_sync on public.generations;
create trigger on_generation_gallery_sync
after insert or update of user_id, prompt, aspect_ratio, cost, image_url, created_at
on public.generations
for each row execute function public.handle_generation_gallery_sync();

create or replace function public.handle_user_gallery_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.community_gallery_items
  set creator_email = new.email,
      creator_role = new.role
  where user_id = new.id;

  return new;
end;
$$;

drop trigger if exists on_user_gallery_sync on public.users;
create trigger on_user_gallery_sync
after update of email, role
on public.users
for each row execute function public.handle_user_gallery_sync();

insert into public.community_gallery_items (
  generation_id,
  user_id,
  creator_email,
  creator_role,
  prompt,
  aspect_ratio,
  cost,
  image_url,
  created_at
)
select
  g.id,
  g.user_id,
  u.email,
  u.role,
  g.prompt,
  g.aspect_ratio,
  g.cost,
  g.image_url,
  g.created_at
from public.generations as g
join public.users as u
  on u.id = g.user_id
on conflict (generation_id)
do update set
  user_id = excluded.user_id,
  creator_email = excluded.creator_email,
  creator_role = excluded.creator_role,
  prompt = excluded.prompt,
  aspect_ratio = excluded.aspect_ratio,
  cost = excluded.cost,
  image_url = excluded.image_url,
  created_at = excluded.created_at;

alter table public.community_gallery_items enable row level security;

drop policy if exists community_gallery_items_select_authenticated on public.community_gallery_items;
create policy community_gallery_items_select_authenticated
on public.community_gallery_items
for select
to authenticated
using (true);

revoke all on public.community_gallery_items from anon;
grant select on public.community_gallery_items to authenticated;
grant all on public.community_gallery_items to service_role;
