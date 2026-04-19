create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key,
  email text unique not null,
  role text not null default 'user',
  isFirstAdmin boolean default false,
  createdAt timestamptz default now(),
  updatedAt timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key,
  firstName text,
  lastName text,
  email text,
  phone text,
  role text default 'user',
  createdAt timestamptz default now(),
  updatedAt timestamptz default now()
);

do $$ begin
  alter table public.users drop constraint if exists users_role_check;
  alter table public.users
    add constraint users_role_check
    check (lower(role) in ('user', 'admin', 'greeter', 'driver', 'office', 'administrator'));
exception when undefined_table then null; end $$;

do $$ begin
  alter table public.profiles drop constraint if exists profiles_role_check;
  alter table public.profiles
    add constraint profiles_role_check
    check (lower(coalesce(role, 'user')) in ('user', 'admin', 'greeter', 'driver', 'office', 'administrator'));
exception when undefined_table then null; end $$;

create table if not exists public.locations (
  id text primary key,
  name text not null,
  type text,
  airport text,
  terminal text,
  address text,
  status text default 'active',
  isAirport boolean default false,
  terminals jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  title text,
  name text,
  description text,
  passengers integer default 1,
  bags integer default 0,
  wifi boolean default false,
  meet_greet boolean default false,
  drinks boolean default false,
  waiting_time text,
  base_price numeric default 0,
  price_per_hour numeric default 0,
  image_url text,
  vehicle_status text default 'active',
  daily_rate numeric default 0,
  created_at timestamptz default now()
);

create table if not exists public.service_rates (
  id text primary key,
  type text,
  baseRate numeric default 0,
  description text
);

create table if not exists public.extra_charges (
  id text primary key,
  type text,
  amount numeric default 0,
  description text
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  booking_ref text,
  full_name text,
  email text,
  phone text,
  pickup_location text,
  dropoff_location text,
  date_time timestamptz,
  service_type text,
  service_subtype text,
  duration integer,
  duration_unit text,
  additional_requests text,
  flight_number_arrival text,
  flight_number_departure text,
  passengers integer default 1,
  bags integer default 0,
  want_buggy boolean default false,
  want_porter boolean default false,
  contact_consent boolean default false,
  amount numeric default 0,
  status text default 'pending',
  payment_status text default 'pending',
  stripe_session_id text,
  driver_id uuid,
  driver_status text default 'unassigned',
  dispatch_notes text,
  assigned_at timestamptz,
  accepted_at timestamptz,
  picked_up_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.bookings add column if not exists bags integer default 0;
alter table public.bookings add column if not exists want_buggy boolean default false;
alter table public.bookings add column if not exists want_porter boolean default false;
alter table public.bookings add column if not exists contact_consent boolean default false;
alter table public.bookings add column if not exists flight_number_arrival text;
alter table public.bookings add column if not exists flight_number_departure text;
alter table public.bookings add column if not exists booking_ref text;
alter table public.bookings add column if not exists stripe_session_id text;
alter table public.bookings add column if not exists driver_id uuid;
alter table public.bookings add column if not exists driver_status text default 'unassigned';
alter table public.bookings add column if not exists dispatch_notes text;
alter table public.bookings add column if not exists assigned_at timestamptz;
alter table public.bookings add column if not exists accepted_at timestamptz;
alter table public.bookings add column if not exists picked_up_at timestamptz;
alter table public.bookings add column if not exists completed_at timestamptz;

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  firstName text,
  lastName text,
  email text,
  phone text,
  paymentDetails text,
  status text default 'inactive'
);

create table if not exists public.driverPayments (
  id uuid primary key default gen_random_uuid(),
  driverId uuid references public.drivers(id) on delete set null,
  bookingId text,
  amount numeric default 0,
  status text default 'pending',
  paymentDate timestamptz,
  paymentMethod text default 'bank_transfer',
  createdAt timestamptz default now()
);

create table if not exists public.greeter_invoices (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  booking_ref text,
  greeter_id uuid references public.drivers(id) on delete set null,
  greeter_email text not null,
  amount numeric default 0,
  notes text,
  office_status text default 'submitted',
  office_notes text,
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  processed_at timestamptz,
  payment_reference text
);

create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

alter table public.greeter_invoices add column if not exists booking_id uuid;
alter table public.greeter_invoices add column if not exists booking_ref text;
alter table public.greeter_invoices add column if not exists greeter_id uuid;
alter table public.greeter_invoices add column if not exists greeter_email text;
alter table public.greeter_invoices add column if not exists amount numeric default 0;
alter table public.greeter_invoices add column if not exists notes text;
alter table public.greeter_invoices add column if not exists office_status text default 'submitted';
alter table public.greeter_invoices add column if not exists office_notes text;
alter table public.greeter_invoices add column if not exists submitted_at timestamptz default now();
alter table public.greeter_invoices add column if not exists reviewed_at timestamptz;
alter table public.greeter_invoices add column if not exists reviewed_by text;
alter table public.greeter_invoices add column if not exists processed_at timestamptz;
alter table public.greeter_invoices add column if not exists payment_reference text;

create unique index if not exists greeter_invoices_booking_email_key
  on public.greeter_invoices (booking_id, greeter_email);

do $$ begin
  alter table public.bookings
    add constraint bookings_driver_id_fkey
    foreign key (driver_id) references public.drivers(id) on delete set null;
exception when duplicate_object then null; end $$;

alter table public.users enable row level security;
alter table public.profiles enable row level security;

do $$ begin
  create policy "users can read own user record" on public.users for select using (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "users can insert own user record" on public.users for insert with check (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "users can update own user record" on public.users for update using (auth.uid() = id);
exception when duplicate_object then null; end $$;
alter table public.locations enable row level security;
alter table public.vehicles enable row level security;
alter table public.service_rates enable row level security;
alter table public.extra_charges enable row level security;
alter table public.bookings enable row level security;
alter table public.drivers enable row level security;
alter table public.driverPayments enable row level security;
alter table public.greeter_invoices enable row level security;
alter table public.app_settings enable row level security;

do $$ begin
  create policy "public read locations" on public.locations for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "public read vehicles" on public.vehicles for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "public read service rates" on public.service_rates for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "public read extra charges" on public.extra_charges for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "users can read own profile" on public.profiles for select using (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "users can update own profile" on public.profiles for update using (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "users can read own bookings" on public.bookings for select using (auth.uid() = user_id or user_id is null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "users can insert bookings" on public.bookings for insert with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "users can update own bookings" on public.bookings for update using (auth.uid() = user_id or user_id is null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "greeters can read own invoices" on public.greeter_invoices for select
  using (lower(greeter_email) = lower(coalesce(auth.jwt() ->> 'email', '')));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "greeters can insert own invoices" on public.greeter_invoices for insert
  with check (lower(greeter_email) = lower(coalesce(auth.jwt() ->> 'email', '')));
exception when duplicate_object then null; end $$;

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;
