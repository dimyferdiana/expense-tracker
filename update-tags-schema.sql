-- Add color column to tags table if it doesn't exist
ALTER TABLE tags 
ADD COLUMN IF NOT EXISTS color TEXT;

-- Update existing tags to have a default color if needed
UPDATE tags 
SET color = 'blue' 
WHERE color IS NULL;

-- Refresh the schema cache to make sure changes are immediately visible
NOTIFY pgrst, 'reload schema'; 