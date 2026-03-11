-- ============================================================
-- Fix push_subscriptions: remove leftover user_id column
-- from when auth was removed (migration 003 missed this table)
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop the user_id column that was left over from auth removal
ALTER TABLE public.push_subscriptions DROP COLUMN IF EXISTS user_id;

-- Make sure the RLS policy allows anon access (single user mode)
DROP POLICY IF EXISTS "Allow all operations for push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON public.push_subscriptions;

CREATE POLICY "Allow all operations for push subscriptions"
  ON public.push_subscriptions FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
