create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  audience text not null check (audience in ('user', 'agent', 'all')),
  file_name text,
  file_path text unique,
  file_size_bytes bigint,
  content_type text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint lessons_file_metadata_consistent check (
    (
      file_name is null
      and file_path is null
      and file_size_bytes is null
      and content_type is null
    )
    or (
      file_name is not null
      and file_path is not null
      and file_size_bytes is not null
      and content_type is not null
    )
  )
);

create index if not exists lessons_created_at_idx
  on public.lessons (created_at desc);

create index if not exists lessons_audience_created_at_idx
  on public.lessons (audience, created_at desc);

create or replace function public.set_lessons_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists on_lessons_set_updated_at on public.lessons;
create trigger on_lessons_set_updated_at
before update on public.lessons
for each row execute function public.set_lessons_updated_at();

alter table public.lessons enable row level security;

drop policy if exists lessons_select_authenticated on public.lessons;
create policy lessons_select_authenticated
on public.lessons
for select
to authenticated
using (
  exists (
    select 1
    from public.users as u
    where u.id = auth.uid()
      and (
        u.role = 'admin'
        or (u.role = 'user' and public.lessons.audience in ('user', 'all'))
        or (u.role = 'agent' and public.lessons.audience in ('agent', 'all'))
      )
  )
);

revoke all on public.lessons from anon;
grant select on public.lessons to authenticated;
grant all on public.lessons to service_role;
