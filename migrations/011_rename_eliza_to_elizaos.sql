-- Migration 011: Rename "eliza" to "elizaos"
-- Standardizes framework naming and aligns with new branding.

-- 1. Update existing agents to use 'elizaos'
UPDATE public.agents 
SET framework = 'elizaos' 
WHERE framework = 'eliza';

-- 2. Update the "eliza" runtime entry to "elizaos"
UPDATE public.runtimes
SET name = 'elizaos'
WHERE name = 'eliza';

-- 3. Update any actual state references if needed (status is usually enough, but just in case)
-- (No changes needed in actual state schema as it doesn't store framework name directly, only runtime_id)

-- 4. Update the default value for the framework column (already done in schema.sql, but good for active DBs)
ALTER TABLE public.agents ALTER COLUMN framework SET DEFAULT 'elizaos';
