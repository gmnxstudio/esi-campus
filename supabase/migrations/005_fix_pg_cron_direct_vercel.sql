-- ============================================================
-- Fix pg_cron: call Vercel /api/push/send directly
-- instead of going through Supabase Edge Function.
-- This is simpler and more reliable.
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop and recreate the trigger function to call Vercel directly
CREATE OR REPLACE FUNCTION public.trigger_push_notification(
  p_title TEXT,
  p_body TEXT,
  p_url TEXT DEFAULT '/'
)
RETURNS VOID AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://esi-campus.vercel.app/api/push/send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'title', p_title,
      'body', p_body,
      'url', p_url
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
