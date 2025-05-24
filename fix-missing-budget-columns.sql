-- Add missing columns to existing budgets table
-- Run this in your Supabase SQL Editor

-- Add missing notes column
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add missing startDate column
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS "startDate" DATE DEFAULT CURRENT_DATE;

-- Add back the createdAt column (frontend expects this exact name)
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Verify the columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'budgets'
ORDER BY ordinal_position; 