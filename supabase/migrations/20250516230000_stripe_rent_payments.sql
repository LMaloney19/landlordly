-- Stripe Checkout rent payments (idempotent by session id)

alter table public.rent_payments
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text;

create unique index if not exists rent_payments_stripe_checkout_session_id_uniq
  on public.rent_payments (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
