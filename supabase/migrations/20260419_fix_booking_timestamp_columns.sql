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
