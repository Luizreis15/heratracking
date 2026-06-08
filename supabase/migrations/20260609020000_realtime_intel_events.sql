-- Enables Realtime for intel_events so badge counts update without polling.
alter publication supabase_realtime add table intel_events;
