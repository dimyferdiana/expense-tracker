-- Force refresh Supabase schema cache
-- Run this in your Supabase SQL Editor if you're still getting cache errors

-- 1. Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- 2. Wait a moment, then check if columns exist
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'budgets'
ORDER BY ordinal_position;

-- 3. If columns are missing, add them again
DO $$
BEGIN
    -- Add notes column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
            AND table_name = 'budgets' 
            AND column_name = 'notes'
    ) THEN
        ALTER TABLE budgets ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes column';
    ELSE
        RAISE NOTICE 'Notes column already exists';
    END IF;
    
    -- Add start_date column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
            AND table_name = 'budgets' 
            AND column_name = 'start_date'
    ) THEN
        ALTER TABLE budgets ADD COLUMN start_date DATE DEFAULT CURRENT_DATE;
        RAISE NOTICE 'Added start_date column';
    ELSE
        RAISE NOTICE 'Start_date column already exists';
    END IF;
END $$;

-- 4. Force another schema reload
NOTIFY pgrst, 'reload schema';

-- 5. Final verification
SELECT 
    'budgets table columns:' as info,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'budgets'; 