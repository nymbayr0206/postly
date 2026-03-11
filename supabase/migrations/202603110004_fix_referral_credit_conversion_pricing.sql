create or replace function public.convert_referral_balance_to_credits(
  p_amount_mnt integer
)
returns table (
  debited_amount_mnt integer,
  credited_credits integer,
  remaining_amount_mnt integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  available_amount integer;
  credit_price_mnt integer;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if p_amount_mnt is null or p_amount_mnt <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  available_amount := public.get_referral_available_balance_mnt(auth.uid());

  if p_amount_mnt > available_amount then
    raise exception 'INSUFFICIENT_REFERRAL_BALANCE';
  end if;

  select greatest(coalesce(ps.credit_price_mnt, 20), 1)
  into credit_price_mnt
  from public.platform_settings as ps
  limit 1;

  credit_price_mnt := coalesce(credit_price_mnt, 20);
  credited_credits := floor(p_amount_mnt::numeric / credit_price_mnt)::integer;

  if credited_credits <= 0 then
    raise exception 'AMOUNT_TOO_SMALL';
  end if;

  debited_amount_mnt := credited_credits * credit_price_mnt;

  insert into public.referral_credit_conversions (user_id, amount_mnt, credited_credits)
  values (auth.uid(), debited_amount_mnt, credited_credits);

  update public.wallets as w
  set credits = w.credits + credited_credits
  where w.user_id = auth.uid();

  remaining_amount_mnt := public.get_referral_available_balance_mnt(auth.uid());
  return next;
end;
$$;
