-- Deduplicate drivers rows with duplicate emails before adding the constraint.
-- Keep the most recently created row (largest id sort as uuid v4) per email.
delete from public.drivers
where id not in (
  select max(id::text)::uuid
  from public.drivers
  where email is not null
  group by lower(trim(email))
)
and email is not null;

-- Normalise existing email values to lowercase so the unique index matches
-- the application-level normalisation.
update public.drivers
set email = lower(trim(email))
where email is not null
  and email <> lower(trim(email));

-- Add a unique constraint on the normalised email column.
-- If the constraint already exists this is a no-op.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.drivers'::regclass
      and conname  = 'drivers_email_unique'
  ) then
    alter table public.drivers
      add constraint drivers_email_unique unique (email);
  end if;
end
$$;
