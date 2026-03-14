alter table public.agent_requests
  add column if not exists payment_provider text not null default 'manual' check (payment_provider in ('manual', 'qpay')),
  add column if not exists qpay_invoice_id text,
  add column if not exists qpay_sender_invoice_no text,
  add column if not exists qpay_payment_id text,
  add column if not exists qpay_payment_status text,
  add column if not exists qpay_short_url text,
  add column if not exists qpay_qr_text text,
  add column if not exists qpay_qr_image text,
  add column if not exists qpay_deeplink jsonb not null default '[]'::jsonb,
  add column if not exists qpay_payment_payload jsonb not null default '{}'::jsonb,
  add column if not exists paid_at timestamptz;

update public.agent_requests
set payment_provider = coalesce(payment_provider, 'manual'),
    qpay_deeplink = coalesce(qpay_deeplink, '[]'::jsonb),
    qpay_payment_payload = coalesce(qpay_payment_payload, '{}'::jsonb)
where payment_provider is null
   or qpay_deeplink is null
   or qpay_payment_payload is null;

create unique index if not exists agent_requests_qpay_invoice_id_key
  on public.agent_requests (qpay_invoice_id)
  where qpay_invoice_id is not null;

create unique index if not exists agent_requests_qpay_sender_invoice_no_key
  on public.agent_requests (qpay_sender_invoice_no)
  where qpay_sender_invoice_no is not null;

create unique index if not exists agent_requests_qpay_payment_id_key
  on public.agent_requests (qpay_payment_id)
  where qpay_payment_id is not null;

create or replace function public.finalize_qpay_agent_request(
  p_request_id uuid,
  p_qpay_payment_id text,
  p_qpay_payment_status text,
  p_payment_payload jsonb default '{}'::jsonb,
  p_paid_at timestamptz default null
)
returns table (
  request_id uuid,
  user_id uuid,
  new_status public.credit_request_status,
  new_balance integer,
  new_role public.user_role,
  payment_status text
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
  select *
  into req
  from public.agent_requests
  where id = p_request_id
  for update;

  if req.id is null then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if req.payment_provider <> 'qpay' then
    raise exception 'INVALID_PAYMENT_PROVIDER';
  end if;

  update public.agent_requests
  set qpay_payment_id = coalesce(p_qpay_payment_id, qpay_payment_id),
      qpay_payment_status = coalesce(p_qpay_payment_status, qpay_payment_status),
      qpay_payment_payload = case
        when p_payment_payload is null or p_payment_payload = '{}'::jsonb then qpay_payment_payload
        else p_payment_payload
      end,
      paid_at = case
        when coalesce(p_qpay_payment_status, qpay_payment_status) = 'PAID'
          then coalesce(p_paid_at, paid_at, now())
        else paid_at
      end,
      updated_at = now()
  where id = p_request_id;

  if req.status = 'pending' and coalesce(p_qpay_payment_status, req.qpay_payment_status) = 'PAID' then
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

    update public.agent_requests
    set status = 'approved',
        updated_at = now()
    where id = p_request_id;

    new_status := 'approved';
    new_role := 'agent';
  else
    select u.role
    into new_role
    from public.users as u
    where u.id = req.user_id;

    select w.credits
    into new_balance
    from public.wallets as w
    where w.user_id = req.user_id;

    new_status := req.status;
  end if;

  request_id := req.id;
  user_id := req.user_id;
  payment_status := coalesce(p_qpay_payment_status, req.qpay_payment_status);
  return next;
end;
$$;

revoke all on function public.finalize_qpay_agent_request(uuid, text, text, jsonb, timestamptz) from public;
grant execute on function public.finalize_qpay_agent_request(uuid, text, text, jsonb, timestamptz) to service_role;
