-- habilita Realtime para blueprints e content_items (usados na UI ao vivo)
alter publication supabase_realtime add table blueprints;
alter publication supabase_realtime add table content_items;
