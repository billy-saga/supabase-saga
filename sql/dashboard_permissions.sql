-- Execute this inside your Supabase project's SQL Editor:

-- 1. Create a secure view/RPC to safely check the size of the parent partition without exposing raw SQL
CREATE OR REPLACE FUNCTION public.get_log_excerpts_size()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pg_size_pretty(pg_total_relation_size('log_excerpts_parent'::regclass));
$$;

-- 2. Grant permission so API can invoke it using Service Role
GRANT EXECUTE ON FUNCTION public.get_log_excerpts_size() TO service_role;

-- 3. (Optional but recommended) Grant SELECT on the parent table to anon key 
-- to allow the dashboard to safely read the latest 20 logs without Row Level Security blocking it
GRANT SELECT ON public.log_excerpts_parent TO anon;
