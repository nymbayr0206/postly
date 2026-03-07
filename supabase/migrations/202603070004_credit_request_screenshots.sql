alter table public.credit_requests
  add column if not exists payment_screenshot_url text;
