-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule daily trial check at 6:00 AM UTC (13:00 WIB)
SELECT cron.schedule(
  'daily-trial-check',
  '0 23 * * *',
  $$
  SELECT net.http_post(
    url:='https://bohuglednqirnaearrkj.supabase.co/functions/v1/trial-check',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaHVnbGVkbnFpcm5hZWFycmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODE0NTYsImV4cCI6MjA4ODU1NzQ1Nn0.oK5vxz2mh7o4S22u1bsO8lFxDgT4f9PpPkQmMyZ1Ji8"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);