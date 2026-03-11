insert into public.platform_settings (id, credit_price_mnt, updated_at)
values (true, 20, now())
on conflict (id)
do update set
  credit_price_mnt = excluded.credit_price_mnt,
  updated_at = now();

with unit_price as (
  select greatest(coalesce((select credit_price_mnt from public.platform_settings limit 1), 20), 1) as value
),
recalculated as (
  select
    cr.id,
    cr.user_id,
    cr.status,
    cr.amount as previous_amount,
    greatest(1, floor(coalesce(cr.amount_mnt, 0)::numeric / up.value)::integer) as base_credits,
    case cr.package_key
      when 'pro' then 5
      when 'scale' then 10
      else 0
    end as bonus_percent
  from public.credit_requests as cr
  cross join unit_price as up
  where cr.package_key in ('starter', 'growth', 'pro', 'scale')
    and coalesce(cr.amount_mnt, 0) > 0
),
normalized as (
  select
    r.id,
    round(r.base_credits * r.bonus_percent / 100.0)::integer as new_bonus_credits,
    (r.base_credits + round(r.base_credits * r.bonus_percent / 100.0)::integer) as new_amount
  from recalculated as r
)
update public.credit_requests as cr
set amount = n.new_amount,
    bonus_credits = n.new_bonus_credits
from normalized as n
where cr.id = n.id;

with unit_price as (
  select greatest(coalesce((select credit_price_mnt from public.platform_settings limit 1), 20), 1) as value
),
recalculated as (
  select
    cr.user_id,
    cr.status,
    cr.amount as previous_amount,
    greatest(1, floor(coalesce(cr.amount_mnt, 0)::numeric / up.value)::integer) as base_credits,
    case cr.package_key
      when 'pro' then 5
      when 'scale' then 10
      else 0
    end as bonus_percent
  from public.credit_requests as cr
  cross join unit_price as up
  where cr.package_key in ('starter', 'growth', 'pro', 'scale')
    and coalesce(cr.amount_mnt, 0) > 0
),
wallet_deltas as (
  select
    r.user_id,
    sum(
      greatest(
        r.previous_amount - (r.base_credits + round(r.base_credits * r.bonus_percent / 100.0)::integer),
        0
      )
    )::integer as credit_delta
  from recalculated as r
  where r.status = 'approved'
  group by r.user_id
)
update public.wallets as w
set credits = greatest(w.credits - wd.credit_delta, 0)
from wallet_deltas as wd
where w.user_id = wd.user_id
  and wd.credit_delta > 0;
