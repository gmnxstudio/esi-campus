-- Drop the table and policies if they exist to allow clean re-running of this script
DROP TABLE IF EXISTS public.user_locations CASCADE;

-- 1. Create the user_locations table (No FOREIGN KEY since users are anonymous)
CREATE TABLE public.user_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  device_info text,
  last_updated timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT user_locations_pkey PRIMARY KEY (id)
);

-- 2. Add an index to make upserts work for user_id (unique per user tracking)
CREATE UNIQUE INDEX idx_user_locations_user_id ON public.user_locations USING btree (user_id);

-- Optional: Add index on last_updated for faster sorted queries
CREATE INDEX idx_user_locations_last_updated ON public.user_locations USING btree (last_updated);

-- 3. Enable RLS
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

-- 4. Policies

-- Allow anonymous PWA users to insert/update location 
CREATE POLICY "Anon users can insert location" 
ON public.user_locations FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "Anon users can update location" 
ON public.user_locations FOR UPDATE 
TO public
USING (true) 
WITH CHECK (true);

-- Allow anyone to read all locations since only the admin accesses the website
CREATE POLICY "Anyone can read all locations"
ON public.user_locations FOR SELECT
TO public
USING (true);

-- 5. Add REALTIME to the table
ALTER PUBLICATION supabase_realtime ADD TABLE user_locations;

-- ═══════════════════════════════════════════════════════════════════
-- 6. Location History Table (V3 - Logs every sync pulse)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.location_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  latitude double precision NOT NULL DEFAULT 0,
  longitude double precision NOT NULL DEFAULT 0,
  device_info text,
  sync_status text DEFAULT 'OK',
  failure_reason text,
  recorded_at timestamptz DEFAULT now()
);

CREATE INDEX idx_location_history_user_time 
  ON public.location_history (user_id, recorded_at DESC);

ALTER TABLE public.location_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert history" 
  ON public.location_history FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Public read history" 
  ON public.location_history FOR SELECT TO public USING (true);

