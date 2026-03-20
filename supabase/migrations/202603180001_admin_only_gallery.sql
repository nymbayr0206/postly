-- Remove the automatic trigger that adds ALL generations to community gallery.
-- From now on, only admins can manually add/remove images from the gallery.

-- 1. Drop the automatic generation sync trigger and function
drop trigger if exists on_generation_gallery_sync on public.generations;
drop function if exists public.handle_generation_gallery_sync();

-- 2. Drop the auto user-email sync trigger and function
drop trigger if exists on_user_gallery_sync on public.users;
drop function if exists public.handle_user_gallery_sync();

-- 3. Drop the old sync helper (no longer needed automatically)
drop function if exists public.sync_community_gallery_item(uuid);

-- 4. Add an RPC that only admins can call to add a generation to the gallery
create or replace function public.admin_add_to_gallery(p_generation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
begin
  select role into v_role
  from public.users
  where id = auth.uid();

  if v_role is distinct from 'admin' then
    raise exception 'ADMIN_REQUIRED';
  end if;

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
  join public.users as u on u.id = g.user_id
  where g.id = p_generation_id
  on conflict (generation_id) do nothing;
end;
$$;

-- 5. Add an RPC that only admins can call to remove a generation from the gallery
create or replace function public.admin_remove_from_gallery(p_generation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
begin
  select role into v_role
  from public.users
  where id = auth.uid();

  if v_role is distinct from 'admin' then
    raise exception 'ADMIN_REQUIRED';
  end if;

  delete from public.community_gallery_items
  where generation_id = p_generation_id;
end;
$$;

grant execute on function public.admin_add_to_gallery(uuid) to authenticated;
grant execute on function public.admin_remove_from_gallery(uuid) to authenticated;
