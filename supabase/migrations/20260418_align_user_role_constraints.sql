alter table if exists public.users drop constraint if exists users_role_check;
alter table if exists public.users
  add constraint users_role_check
  check (lower(role) in ('user', 'admin', 'greeter', 'driver', 'office', 'administrator'));

alter table if exists public.profiles drop constraint if exists profiles_role_check;
alter table if exists public.profiles
  add constraint profiles_role_check
  check (lower(coalesce(role, 'user')) in ('user', 'admin', 'greeter', 'driver', 'office', 'administrator'));
