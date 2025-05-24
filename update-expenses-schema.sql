-- Update expenses table to include any missing columns
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS isIncome BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS photoUrl TEXT;

-- Update existing records if needed
UPDATE expenses
SET description = notes
WHERE description IS NULL AND notes IS NOT NULL;

-- Refresh the schema cache to make sure changes are immediately visible
NOTIFY pgrst, 'reload schema';

-- Comment the following line out if you need to retain the isIncome column in the expenses table
-- If the isIncome column exists but is causing errors:
-- ALTER TABLE expenses DROP COLUMN IF EXISTS isIncome; 