do $$
begin
  alter table if exists public.bookings add column if not exists created_at timestamptz default now();
  alter table if exists public.bookings add column if not exists updated_at timestamptz default now();

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookings'
      and column_name = 'createdat'
  ) then
    execute 'update public.bookings set created_at = coalesce(created_at, createdat) where createdat is not null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookings'
      and column_name = 'updatedat'
  ) then
    execute 'update public.bookings set updated_at = coalesce(updated_at, updatedat) where updatedat is not null';
  end if;
end $$;

do $$
begin
  alter table if exists public.bookings drop constraint if exists bookings_status_check;
  alter table if exists public.bookings
    add constraint bookings_status_check
    check (lower(coalesce(status, 'pending')) in ('pending', 'confirmed', 'assigned', 'accepted', 'picked_up', 'completed', 'cancelled', 'deleted'));

  alter table if exists public.bookings drop constraint if exists bookings_payment_status_check;
  alter table if exists public.bookings
    add constraint bookings_payment_status_check
    check (lower(coalesce(payment_status, 'pending')) in ('pending', 'paid', 'failed', 'cancelled', 'refunded', 'unpaid', 'no_payment_required'));
exception when others then
  raise notice 'booking constraint alignment skipped: %', sqlerrm;
end $$;

create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

insert into public.app_settings (key, value)
values ('office_notification_email', 'desk.vipfirst@gmail.com')
on conflict (key) do nothing;
