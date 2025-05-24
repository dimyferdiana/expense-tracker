# Supabase Schema Fix Instructions

You are experiencing errors related to your Supabase database schema. The errors indicate several issues:

1. The `tags` table is missing a `color` column which is causing conflicts when adding tags
2. The `expenses` table has issues with the `isIncome` column
3. The `expenses` table is missing a `photoUrl` column

## How to Fix

### Option 1: Run the SQL Scripts

1. Log in to your Supabase dashboard at [https://app.supabase.io/](https://app.supabase.io/)
2. Go to your project's SQL Editor
3. Copy and paste the contents of the `update-tags-schema.sql` file and run it
4. Copy and paste the contents of the `update-expenses-schema.sql` file and run it

### Option 2: Run These SQL Commands Directly

Run these commands in the Supabase SQL Editor:

```sql
-- Fix the tags table
ALTER TABLE tags 
ADD COLUMN IF NOT EXISTS color TEXT;

UPDATE tags 
SET color = 'blue' 
WHERE color IS NULL;

-- Fix the expenses table
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS isIncome BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS photoUrl TEXT;

UPDATE expenses
SET description = notes
WHERE description IS NULL AND notes IS NOT NULL;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
```

## Schema Cache Issues

The error `Could not find the X column in the schema cache` indicates that Postgrest (the API layer used by Supabase) needs to refresh its schema cache to recognize the new columns. The `NOTIFY pgrst, 'reload schema'` command should fix this by forcing a reload.

If issues persist after running the SQL commands, try:

1. Waiting a few minutes for the cache to fully refresh
2. Refreshing your browser page
3. Restarting your application

## Issues Fixed in the Code

We've already fixed:

1. The tag color issue in `supabase-db.js` - tag objects now explicitly include the color field
2. The expense schema issue in `supabase-db.js` - fields are now correctly mapped to the database schema

After applying the SQL fixes above, your application should work correctly. 