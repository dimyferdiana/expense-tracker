-- Comprehensive fix for all tables in Expense Tracker

-- 1. Fix categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS color TEXT;

-- Update existing categories to have a default color if needed
UPDATE categories 
SET color = 'blue' 
WHERE color IS NULL;

-- 2. Fix tags table
ALTER TABLE tags 
ADD COLUMN IF NOT EXISTS color TEXT;

-- Update existing tags to have a default color if needed
UPDATE tags 
SET color = 'blue' 
WHERE color IS NULL;

-- 3. Fix expenses table
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS wallet_id TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_income BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Update existing records if needed
UPDATE expenses
SET description = notes
WHERE description IS NULL AND notes IS NOT NULL;

-- 4. Force schema cache reload multiple times to ensure it takes effect
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(1); -- Wait 1 second
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(1); -- Wait 1 second
NOTIFY pgrst, 'reload schema';

-- 5. Verify all tables have the correct columns
SELECT 
    'Categories table columns:' as check,
    column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'categories'
ORDER BY ordinal_position;

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