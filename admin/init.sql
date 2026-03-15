-- Drop the table and policies if they exist to allow clean re-running of this script
DROP TABLE IF EXISTS public.user_locations CASCADE;

-- 1. Create the user_locations table
CREATE TABLE public.user_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  last_updated timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT user_locations_pkey PRIMARY KEY (id),
  CONSTRAINT user_locations_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- 2. Add an index to make upserts work for user_id (unique per user tracking)
CREATE UNIQUE INDEX idx_user_locations_user_id ON public.user_locations USING btree (user_id);

-- Optional: Add index on last_updated for faster sorted queries
CREATE INDEX idx_user_locations_last_updated ON public.user_locations USING btree (last_updated);

-- 3. Enable RLS
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

-- 4. Policies

-- Allow authenticated users to insert/update their own location
CREATE POLICY "Users can insert their own location" 
ON public.user_locations FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own location" 
ON public.user_locations FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Allow anyone to read all locations since only the admin accesses the website
CREATE POLICY "Anyone can read all locations"
ON public.user_locations FOR SELECT
TO public
USING (true);

-- 5. Add REALTIME to the table
ALTER PUBLICATION supabase_realtime ADD TABLE user_locations;
