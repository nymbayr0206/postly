with buggy_agent_referrals as (
  select
    re.referrer_user_id,
    sum(re.commission_credits)::integer as total_buggy_credits
  from public.referral_earnings as re
  where re.agent_request_id is not null
    and re.commission_amount_mnt = 0
    and re.commission_credits > 0
  group by re.referrer_user_id
)
update public.wallets as w
set credits = greatest(w.credits - bar.total_buggy_credits, 0)
from buggy_agent_referrals as bar
where w.user_id = bar.referrer_user_id;

update public.referral_earnings
set commission_amount_mnt = 30000,
    commission_credits = 0,
    commission_rate = 0.20
where agent_request_id is not null
  and commission_amount_mnt = 0
  and commission_credits > 0;

create or replace function public.process_agent_request(
  p_request_id uuid,
  p_status public.credit_request_status
)
returns table (
  request_id uuid,
  user_id uuid,
  new_status public.credit_request_status,
  new_balance integer,
  new_role public.user_role
)
language plpgsql
security definer
set search_path = public
as $$
declare
  req record;
  agent_tariff_id uuid;
  resolved_referrer_user_id uuid;
  resolved_referrer_role public.user_role;
  approved_agent_credits integer := 2500;
  agent_referral_reward_mnt integer := 30000;
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;

  if p_status = 'pending' then
    raise exception 'INVALID_STATUS';
  end if;

  select *
  into req
  from public.agent_requests
  where id = p_request_id
  for update;

  if req.id is null then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if req.status <> 'pending' then
    raise exception 'ALREADY_PROCESSED';
  end if;

  if p_status = 'approved'
     and coalesce(nullif(trim(req.payment_screenshot_url), ''), '') = '' then
    raise exception 'PAYMENT_PROOF_REQUIRED';
  end if;

  if p_status = 'approved' then
    select id
    into agent_tariff_id
    from public.tariffs
    where name = 'Agent'
    limit 1;

    if agent_tariff_id is null then
      raise exception 'AGENT_TARIFF_NOT_FOUND';
    end if;

    update public.users
    set role = 'agent',
        tariff_id = agent_tariff_id
    where id = req.user_id;

    update public.wallets as w
    set credits = w.credits + approved_agent_credits
    where w.user_id = req.user_id
    returning w.credits into new_balance;

    select u.referred_by_user_id
    into resolved_referrer_user_id
    from public.users as u
    where u.id = req.user_id;

    if resolved_referrer_user_id is not null
       and resolved_referrer_user_id <> req.user_id then
      select u.role
      into resolved_referrer_role
      from public.users as u
      where u.id = resolved_referrer_user_id;

      if resolved_referrer_role = 'agent' then
        insert into public.referral_earnings (
          referrer_user_id,
          referred_user_id,
          credit_request_id,
          agent_request_id,
          credited_amount,
          commission_credits,
          commission_amount_mnt,
          commission_rate
        )
        values (
          resolved_referrer_user_id,
          req.user_id,
          null,
          req.id,
          req.amount_mnt,
          0,
          agent_referral_reward_mnt,
          0.20
        )
        on conflict (agent_request_id) do nothing;
      end if;
    end if;

    new_role := 'agent';
  else
    select role
    into new_role
    from public.users as u
    where u.id = req.user_id;

    select credits
    into new_balance
    from public.wallets as w
    where w.user_id = req.user_id;
  end if;

  update public.agent_requests
  set status = p_status,
      updated_at = now()
  where id = p_request_id;

  request_id := req.id;
  user_id := req.user_id;
  new_status := p_status;
  return next;
end;
$$;
