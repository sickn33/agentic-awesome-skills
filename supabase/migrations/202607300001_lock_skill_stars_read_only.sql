-- Secur0 #2662: the browser key is intentionally public, so authorization
-- must be enforced by PostgreSQL. The public catalog only needs SELECT.
begin;

alter table public.skill_stars enable row level security;
alter table public.skill_stars force row level security;

do $policies$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'skill_stars'
  loop
    execute format('drop policy %I on public.skill_stars', policy_record.policyname);
  end loop;
end
$policies$;

revoke all privileges on table public.skill_stars from anon, authenticated;
grant select on table public.skill_stars to anon, authenticated;

create policy skill_stars_public_read_only
  on public.skill_stars
  for select
  to anon, authenticated
  using (true);

-- Prevent an exposed browser role from obtaining write access through a
-- sequence even if the table schema later changes.
do $sequences$
declare
  sequence_record record;
begin
  for sequence_record in
    select sequence_schema, sequence_name
    from information_schema.sequences
    where sequence_schema = 'public'
  loop
    execute format(
      'revoke all privileges on sequence %I.%I from anon, authenticated',
      sequence_record.sequence_schema,
      sequence_record.sequence_name
    );
  end loop;
end
$sequences$;

commit;
