create or replace function public.process_credit_request(
  p_request_id uuid,
  p_status public.credit_request_status
)
returns table (
  request_id uuid,
  user_id uuid,
  new_status public.credit_request_status,
  new_balance integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  req record;
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;

  if p_status = 'pending' then
    raise exception 'INVALID_STATUS';
  end if;

  select *
  into req
  from public.credit_requests
  where id = p_request_id
  for update;

  if req.id is null then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if req.status <> 'pending' then
    raise exception 'ALREADY_PROCESSED';
  end if;

  if p_status = 'approved' then
    update public.wallets as w
    set credits = w.credits + req.amount
    where w.user_id = req.user_id
    returning w.credits into new_balance;
  else
    select w.credits into new_balance
    from public.wallets as w
    where w.user_id = req.user_id;
  end if;

  update public.credit_requests
  set status = p_status
  where id = p_request_id;

  request_id := req.id;
  user_id := req.user_id;
  new_status := p_status;
  return next;
end;
$$;
