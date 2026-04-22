-- ============================================================
-- Migration: Heathrow role constraints + RLS policies
-- Run this in the Supabase SQL editor (or via CLI)
-- ============================================================

-- 1. Expand role constraint on users to include heathrow roles
alter table if exists public.users drop constraint if exists users_role_check;
alter table if exists public.users
  add constraint users_role_check
  check (lower(role) in (
    'user', 'admin', 'greeter', 'driver', 'office', 'administrator',
    'heathrow', 'heathrow_monitor', 'airport_ops'
  ));

-- 2. Expand role constraint on profiles to match
alter table if exists public.profiles drop constraint if exists profiles_role_check;
alter table if exists public.profiles
  add constraint profiles_role_check
  check (lower(coalesce(role, 'user')) in (
    'user', 'admin', 'greeter', 'driver', 'office', 'administrator',
    'heathrow', 'heathrow_monitor', 'airport_ops'
  ));

-- 3. Helper function — returns the current authenticated user's role
--    SECURITY DEFINER so it can read the users table regardless of RLS.
create or replace function public.get_current_user_role()
returns text
language sql
stable
security definer
as $$
  select lower(role) from public.users where id = auth.uid();
$$;

-- 4. Grant execute to authenticated and anon so policies can call it
grant execute on function public.get_current_user_role() to authenticated, anon;

-- 5. RLS: admins and office staff can read/write all bookings
do $$ begin
  create policy "admins can read all bookings"
    on public.bookings
    for select
    using (
      public.get_current_user_role() in ('admin', 'administrator', 'office')
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins can update all bookings"
    on public.bookings
    for update
    using (
      public.get_current_user_role() in ('admin', 'administrator', 'office')
    );
exception when duplicate_object then null; end $$;

-- 6. RLS: heathrow roles get read-only access to all bookings (monitoring)
do $$ begin
  create policy "heathrow can read all bookings"
    on public.bookings
    for select
    using (
      public.get_current_user_role() in ('heathrow', 'heathrow_monitor', 'airport_ops')
    );
exception when duplicate_object then null; end $$;

-- 7. RLS: admins can read and manage invoices (if accessed via anon key)
do $$ begin
  create policy "admins can read all invoices"
    on public.greeter_invoices
    for select
    using (
      public.get_current_user_role() in ('admin', 'administrator', 'office')
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins can update invoices"
    on public.greeter_invoices
    for update
    using (
      public.get_current_user_role() in ('admin', 'administrator', 'office')
    );
exception when duplicate_object then null; end $$;

-- 8. RLS: admins can read all drivers
do $$ begin
  create policy "admins can read all drivers"
    on public.drivers
    for select
    using (
      public.get_current_user_role() in ('admin', 'administrator', 'office')
    );
exception when duplicate_object then null; end $$;

-- 9. Users can read the driver assigned to their own booking
--    (needed for the passenger greeter detail feature if queried client-side)
do $$ begin
  create policy "users can read their assigned driver"
    on public.drivers
    for select
    using (
      exists (
        select 1 from public.bookings
        where bookings.driver_id = drivers.id
          and bookings.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;
