insert into public.models (name, base_cost)
values ('nano-banana-2', 1)
on conflict (name)
do update set base_cost = excluded.base_cost;
