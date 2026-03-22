insert into public.models (name, base_cost)
values
  ('veo3_fast', 12),
  ('veo3', 50)
on conflict (name)
do update set base_cost = excluded.base_cost;
