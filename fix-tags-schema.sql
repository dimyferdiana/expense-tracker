-- Fix tags schema and data for Expense Tracker

-- 1. First, let's create a temporary table to store the correct tag data
CREATE TEMP TABLE temp_tags AS
SELECT DISTINCT jsonb_array_elements(tags::jsonb) as tag_data
FROM expenses
WHERE tags IS NOT NULL AND tags != '{}';

-- 2. Update the expenses table to store only tag IDs
UPDATE expenses
SET tags = (
  SELECT array_agg(
    CASE 
      WHEN jsonb_typeof(tag_data) = 'object' THEN (tag_data->>'id')::text
      ELSE tag_data::text
    END
  )
  FROM jsonb_array_elements(tags::jsonb) as tag_data
)
WHERE tags IS NOT NULL AND tags != '{}';

-- 3. Force schema cache reload
NOTIFY pgrst, 'reload schema';

-- 4. Verify the changes
SELECT 
    'Tags in expenses table:' as check,
    id,
    tags
FROM expenses
WHERE tags IS NOT NULL AND tags != '{}'
LIMIT 5; 