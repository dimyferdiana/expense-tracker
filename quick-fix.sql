-- COMPREHENSIVE FIX SCRIPT FOR EXPENSE TRACKER APP
-- This script fixes all known schema issues in one go

-- 1. Fix the tags table
ALTER TABLE tags 
ADD COLUMN IF NOT EXISTS color TEXT;

-- Update existing tags to have a default color if needed
UPDATE tags 
SET color = 'blue' 
WHERE color IS NULL;

-- 2. Fix the expenses table
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_income BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Update existing records if needed
UPDATE expenses
SET description = notes
WHERE description IS NULL AND notes IS NOT NULL;

-- 3. Fix the categories table (in case color is missing)
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS color TEXT;

-- 4. Fix field names if needed
-- If you encounter any issues with inconsistent field names, uncomment and modify as needed:
-- ALTER TABLE expenses RENAME COLUMN old_column_name TO new_column_name;

-- 5. Force schema cache reload
NOTIFY pgrst, 'reload schema';

-- 6. Verify tables existence (returns error if any table doesn't exist)
SELECT
  (SELECT COUNT(*) FROM expenses) AS expenses_count,
  (SELECT COUNT(*) FROM categories) AS categories_count,
  (SELECT COUNT(*) FROM tags) AS tags_count,
  (SELECT COUNT(*) FROM wallets) AS wallets_count;

-- 7. Report results
SELECT 
  'Schema fix applied successfully. Schema cache reload requested.' AS result; 