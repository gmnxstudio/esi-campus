-- ============================================================
-- Praishe's Campus - Guardian Notification Scheduling
-- pg_cron jobs (times are in UTC, WIB = UTC+7)
-- ============================================================

-- Enable pg_cron and pg_net extensions (must be enabled in Supabase dashboard)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- HELPER FUNCTION: Call Edge Function to send push notification
-- ============================================================
CREATE OR REPLACE FUNCTION public.trigger_push_notification(
  p_title TEXT,
  p_body TEXT,
  p_url TEXT DEFAULT '/'
)
RETURNS VOID AS $$
DECLARE
  supabase_url TEXT := current_setting('app.supabase_url', true);
  service_key TEXT := current_setting('app.service_role_key', true);
BEGIN
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'title', p_title,
      'body', p_body,
      'url', p_url
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- JOB 1: Nightly Reminder — 19:00 WIB = 12:00 UTC
-- "Hey Praishe! You have classes tomorrow: [subject list]"
-- ============================================================
SELECT cron.schedule(
  'nightly-class-reminder',
  '0 12 * * *',
  $$
  DO $$
  DECLARE
    tomorrow_dow INTEGER := EXTRACT(DOW FROM (NOW() AT TIME ZONE 'Asia/Jakarta') + INTERVAL '1 day')::INTEGER;
    subject_list TEXT;
  BEGIN
    SELECT STRING_AGG(c.subject, ', ' ORDER BY c.start_time) INTO subject_list
    FROM public.classes c
    WHERE c.day_of_week = tomorrow_dow;

    IF subject_list IS NOT NULL THEN
      PERFORM public.trigger_push_notification(
        '📚 Classes Tomorrow!',
        'You have ' || subject_list || ' tomorrow. Prepare your materials! ✨',
        '/schedule'
      );
    END IF;
  END;
  $$ LANGUAGE plpgsql;
  $$
);

-- ============================================================
-- JOB 2: Morning Reminder — 06:00 WIB = 23:00 UTC (previous day)
-- "Good morning! Today you have: [subject list]"
-- ============================================================
SELECT cron.schedule(
  'morning-class-reminder',
  '0 23 * * *',
  $$
  DO $$
  DECLARE
    today_dow INTEGER := EXTRACT(DOW FROM ((NOW() + INTERVAL '7 hours') + INTERVAL '1 day') AT TIME ZONE 'UTC')::INTEGER;
    subject_list TEXT;
  BEGIN
    SELECT STRING_AGG(c.subject || ' at ' || TO_CHAR(c.start_time, 'HH:MI AM'), ', ' ORDER BY c.start_time) INTO subject_list
    FROM public.classes c
    WHERE c.day_of_week = today_dow;

    IF subject_list IS NOT NULL THEN
      PERFORM public.trigger_push_notification(
        '☀️ Good Morning, Praishe!',
        'Today: ' || subject_list || '. Have an amazing day! 🌸',
        '/'
      );
    END IF;
  END;
  $$ LANGUAGE plpgsql;
  $$
);

-- ============================================================
-- JOB 3: Attendance Check — every minute, find classes starting in 10 min
-- ============================================================
SELECT cron.schedule(
  'attendance-check',
  '* * * * *',
  $$
  DO $$
  DECLARE
    r RECORD;
    now_wib TIME := (NOW() AT TIME ZONE 'Asia/Jakarta')::TIME;
    now_dow INTEGER := EXTRACT(DOW FROM NOW() AT TIME ZONE 'Asia/Jakarta')::INTEGER;
    target_time TIME := now_wib + INTERVAL '10 minutes';
  BEGIN
    FOR r IN
      SELECT c.subject, c.room, c.start_time
      FROM public.classes c
      WHERE c.day_of_week = now_dow
        AND c.start_time >= target_time
        AND c.start_time < target_time + INTERVAL '1 minute'
    LOOP
      PERFORM public.trigger_push_notification(
        '⏰ Class Starting Soon!',
        r.subject || ' starts in 10 minutes at ' || COALESCE(r.room, 'check your schedule') || '. Time to head out! 🏃‍♀️',
        '/'
      );
    END LOOP;
  END;
  $$ LANGUAGE plpgsql;
  $$
);
