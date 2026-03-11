-- ============================================================
-- Fix pg_cron: replace broken inline DO $$ blocks with
-- proper SQL functions + simple cron job strings.
-- Bug: $$ inside $$ caused cron SQL to be malformed.
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create dedicated function: nightly reminder (19:00 WIB = 12:00 UTC)
CREATE OR REPLACE FUNCTION public.cron_nightly_reminder()
RETURNS VOID AS $func$
DECLARE
    tomorrow_dow INTEGER;
    subject_list TEXT;
BEGIN
    tomorrow_dow := EXTRACT(DOW FROM (NOW() AT TIME ZONE 'Asia/Jakarta') + INTERVAL '1 day')::INTEGER;

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
$func$ LANGUAGE plpgsql;

-- 2. Create dedicated function: morning reminder (06:00 WIB = 23:00 UTC prev day)
CREATE OR REPLACE FUNCTION public.cron_morning_reminder()
RETURNS VOID AS $func$
DECLARE
    today_dow INTEGER;
    subject_list TEXT;
BEGIN
    today_dow := EXTRACT(DOW FROM ((NOW() + INTERVAL '7 hours') + INTERVAL '1 day') AT TIME ZONE 'UTC')::INTEGER;

    SELECT STRING_AGG(
        c.subject || ' at ' || TO_CHAR(c.start_time, 'HH:MI AM'), ', '
        ORDER BY c.start_time
    ) INTO subject_list
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
$func$ LANGUAGE plpgsql;

-- 3. Create dedicated function: 10-minute class reminder (runs every minute)
CREATE OR REPLACE FUNCTION public.cron_attendance_check()
RETURNS VOID AS $func$
DECLARE
    r RECORD;
    now_wib TIME;
    now_dow INTEGER;
    target_time TIME;
BEGIN
    now_wib    := (NOW() AT TIME ZONE 'Asia/Jakarta')::TIME;
    now_dow    := EXTRACT(DOW FROM NOW() AT TIME ZONE 'Asia/Jakarta')::INTEGER;
    target_time := now_wib + INTERVAL '10 minutes';

    FOR r IN
        SELECT c.subject, c.room, c.start_time
        FROM public.classes c
        WHERE c.day_of_week = now_dow
          AND c.start_time >= target_time
          AND c.start_time <  target_time + INTERVAL '1 minute'
    LOOP
        PERFORM public.trigger_push_notification(
            '⏰ Class Starting Soon!',
            r.subject || ' starts in 10 minutes' ||
                CASE WHEN r.room IS NOT NULL THEN ' at ' || r.room ELSE '' END ||
                '. Time to head out! 🏃',
            '/'
        );
    END LOOP;
END;
$func$ LANGUAGE plpgsql;

-- 4. Remove old broken cron jobs and re-register with simple SQL strings
SELECT cron.unschedule('nightly-class-reminder');
SELECT cron.unschedule('morning-class-reminder');
SELECT cron.unschedule('attendance-check');

-- 5. Register clean cron jobs (simple SELECT string — no $$ conflict)
SELECT cron.schedule('nightly-class-reminder', '0 12 * * *',  'SELECT public.cron_nightly_reminder();');
SELECT cron.schedule('morning-class-reminder', '0 23 * * *',  'SELECT public.cron_morning_reminder();');
SELECT cron.schedule('attendance-check',        '* * * * *',   'SELECT public.cron_attendance_check();');

-- 6. Verify jobs are registered
SELECT jobname, schedule, active FROM cron.job WHERE jobname IN (
    'nightly-class-reminder', 'morning-class-reminder', 'attendance-check'
);
