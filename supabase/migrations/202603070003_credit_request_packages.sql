alter table public.credit_requests
  add column if not exists package_key text,
  add column if not exists amount_mnt integer,
  add column if not exists bonus_credits integer not null default 0;

update public.credit_requests
set package_key = coalesce(package_key, 'legacy'),
    amount_mnt = coalesce(amount_mnt, amount),
    bonus_credits = coalesce(bonus_credits, 0)
where package_key is null
   or amount_mnt is null
   or bonus_credits is null;
