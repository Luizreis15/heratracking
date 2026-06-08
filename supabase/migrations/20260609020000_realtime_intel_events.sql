-- Enables Realtime for intel_events so badge counts update without polling.
-- Guard: add only if not already a member of the publication.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'intel_events'
  ) then
    alter publication supabase_realtime add table intel_events;
  end if;
end$$;
