create table if not exists public.greeter_availability (
  id uuid primary key default gen_random_uuid(),
  greeter_email text not null,
  availability_date date not null,
  is_available boolean not null default false,
  all_day boolean not null default true,
  start_time time,
  end_time time,
  updated_at timestamptz not null default now()
);

create unique index if not exists greeter_availability_email_date_unique
  on public.greeter_availability (greeter_email, availability_date);

create index if not exists greeter_availability_email_date_idx
  on public.greeter_availability (greeter_email, availability_date);

create or replace function public.greeter_availability_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_greeter_availability_touch_updated_at on public.greeter_availability;
create trigger trg_greeter_availability_touch_updated_at
before update on public.greeter_availability
for each row
execute function public.greeter_availability_touch_updated_at();

alter table public.greeter_availability
  drop constraint if exists greeter_availability_time_window_check;

alter table public.greeter_availability
  add constraint greeter_availability_time_window_check
  check (
    (is_available = false and start_time is null and end_time is null)
    or
    (is_available = true and all_day = true and start_time is null and end_time is null)
    or
    (is_available = true and all_day = false and start_time is not null and end_time is not null and start_time < end_time)
  );
