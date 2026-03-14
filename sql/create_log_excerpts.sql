-- Create parent table partitioned by month; partitions will get PK (id, ts)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop parent if exists (safe if empty)
DROP TABLE IF EXISTS log_excerpts_parent CASCADE;

-- Parent table (no PRIMARY KEY here)
CREATE TABLE IF NOT EXISTS log_excerpts_parent (
    id uuid DEFAULT gen_random_uuid(),
    source text,
    source_id uuid,
    level text,
    message_excerpt text,
    ts timestamptz NOT NULL DEFAULT now(),
    metadata jsonb,
    archived boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
) PARTITION BY RANGE (ts);

-- Indexes on parent
CREATE INDEX IF NOT EXISTS idx_logex_parent_source_id ON log_excerpts_parent (source_id);
CREATE INDEX IF NOT EXISTS idx_logex_parent_ts ON log_excerpts_parent (ts);

-- Function to create monthly partition and add PRIMARY KEY (id, ts)
CREATE OR REPLACE FUNCTION public.create_month_partition(p_year int, p_month int)
RETURNS text
LANGUAGE plpgsql
AS
$$
DECLARE
    start_date date := make_date(p_year, p_month, 1);
    end_date date := (start_date + interval '1 month')::date;
    part_name text := format('log_excerpts_%s_%s', p_year, lpad(p_month::text,2,'0'));
    sql text;
    has_pkey boolean;
BEGIN
    sql := format('CREATE TABLE IF NOT EXISTS %I PARTITION OF log_excerpts_parent FOR VALUES FROM (%L) TO (%L);',
                  part_name, start_date::text, end_date::text);
    EXECUTE sql;

    -- Check if the partition already has a primary key
    SELECT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = part_name AND c.contype = 'p'
    ) INTO has_pkey;

    IF NOT has_pkey THEN
        sql := format('ALTER TABLE %I ADD CONSTRAINT %I_pkey PRIMARY KEY (id, ts);', part_name, part_name);
        EXECUTE sql;
    END IF;

    RETURN part_name;
END;
$$;

-- Batch delete function (default retention_days = 90)
CREATE OR REPLACE FUNCTION public.clean_old_log_excerpts(IN batch_size integer DEFAULT 1000, IN retention_days integer DEFAULT 90)
RETURNS jsonb
LANGUAGE plpgsql
AS
$$
DECLARE
    deleted_total bigint := 0;
    deleted_count integer := 0;
    cutoff timestamptz := now() - (retention_days * interval '1 day');
BEGIN
    LOOP
        WITH to_delete AS (
            SELECT id FROM log_excerpts_parent
            WHERE ts < cutoff
            LIMIT batch_size
            FOR UPDATE SKIP LOCKED
        )
        DELETE FROM log_excerpts_parent
        WHERE id IN (SELECT id FROM to_delete)
        RETURNING 1
        INTO deleted_count;
        
        IF NOT FOUND OR deleted_count = 0 THEN
            EXIT;
        END IF;
        
        deleted_total := deleted_total + deleted_count;
        PERFORM pg_sleep(0.2);
    END LOOP;
    
    RETURN jsonb_build_object('deleted', deleted_total, 'cutoff', cutoff);
END;
$$;

-- Revoke public execution of cleanup
REVOKE ALL ON FUNCTION public.clean_old_log_excerpts(integer, integer) FROM PUBLIC;
