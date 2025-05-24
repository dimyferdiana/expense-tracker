-- Fix schema cache issues for Expense Tracker

-- 1. Fix tags table
ALTER TABLE tags 
ADD COLUMN IF NOT EXISTS color TEXT;

-- Update existing tags to have a default color if needed
UPDATE tags 
SET color = 'blue' 
WHERE color IS NULL;

-- 2. Fix expenses table
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS wallet_id TEXT,  -- Changed from walletId to wallet_id to match Supabase conventions
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_income BOOLEAN DEFAULT FALSE,  -- Changed from isIncome to is_income
ADD COLUMN IF NOT EXISTS photo_url TEXT;  -- Changed from photoUrl to photo_url

-- Update existing records if needed
UPDATE expenses
SET description = notes
WHERE description IS NULL AND notes IS NOT NULL;

-- 3. Force schema cache reload
NOTIFY pgrst, 'reload schema';

-- 4. Verify the changes
SELECT 
    'Tags table columns:' as check,
    column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tags'
ORDER BY ordinal_position;

SELECT 
    'Expenses table columns:' as check,
    column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'expenses'
ORDER BY ordinal_position; 