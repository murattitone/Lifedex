-- Daily refresh of the "Önemli" feed (holidays, religious days, shopping days, news).
-- The bearer value is the project's public anon key (safe to commit; RLS protects data).
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule('alerts-sync-daily', '17 4 * * *', $$
  select net.http_post(
    url := 'https://pcddakllvoebaaswsspu.supabase.co/functions/v1/alerts-sync',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZGRha2xsdm9lYmFhc3dzc3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNTY5MzMsImV4cCI6MjEwODkzMjkzM30.qlT-1ZTUN90vxNpS1id_vAgiAqImZcz8rLSwlkqKy7s'),
    body := '{}'::jsonb, timeout_milliseconds := 30000);
$$);
