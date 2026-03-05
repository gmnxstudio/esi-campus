-- ============================================================
-- Fix RLS policies to allow anon role (no-auth single user mode)
-- AND remove user_id columns left over from auth
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Drop OLD auth-based policies first (these reference user_id column)
DROP POLICY IF EXISTS "Users can manage their own classes" ON public.classes;
DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can manage their own exams" ON public.exams;
DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON public.push_subscriptions;

-- Also drop any other existing policies by any name
DROP POLICY IF EXISTS "Allow all operations for classes" ON public.classes;
DROP POLICY IF EXISTS "Allow all operations for tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow all operations for exams" ON public.exams;
DROP POLICY IF EXISTS "Allow all operations for push subscriptions" ON public.push_subscriptions;

-- 2. Now safe to drop user_id columns (no dependent policies remain)
ALTER TABLE public.classes DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.exams DROP COLUMN IF EXISTS user_id;

-- 3. Re-create policies with explicit anon + authenticated roles (no-auth mode)
CREATE POLICY "Allow all operations for classes"
  ON public.classes FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for tasks"
  ON public.tasks FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for exams"
  ON public.exams FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations for push subscriptions"
  ON public.push_subscriptions FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
