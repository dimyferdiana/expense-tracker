-- Add only the missing notes column to existing budgets table
-- Run this in your Supabase SQL Editor

-- Add missing notes column
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add missing start_date column (using snake_case to match database convention)
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Verify the columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'budgets'
ORDER BY ordinal_position; 