# Supabase Troubleshooting Guide

## Common Error Messages and Solutions

### 1. "duplicate key value violates unique constraint" 

This means you're trying to insert a record with a primary key that already exists.

**Solution:**
- For tags/categories: Make sure IDs are unique before inserting
- Try a "upsert" operation (insert if not exists, update if exists):
  ```javascript
  const { data, error } = await supabase
    .from('table_name')
    .upsert(dataObject)
    .select();
  ```

### 2. "Could not find the 'X' column in the schema cache"

This means the column you're trying to use doesn't exist in the database table.

**Solution:**
- Add the missing column:
  ```sql
  ALTER TABLE table_name
  ADD COLUMN IF NOT EXISTS column_name DATA_TYPE DEFAULT default_value;
  ```
- Or adjust your code to match the existing schema

### 3. "Row level security policy violation"

This means your operation is blocked by a Row Level Security (RLS) policy.

**Solution:**
- Make sure you're authenticated correctly
- Check that the user_id matches the current user
- Verify RLS policies are set up correctly

## How to Check Table Structure

Run this SQL in the Supabase SQL Editor to see the structure of any table:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'your_table_name';
```

## How to Check RLS Policies

```sql
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'your_table_name';
```

## Data Migration Strategy

If your application schema changes significantly:

1. Create a backup of your data
2. Update the database schema
3. Transform your existing data to match the new schema
4. Update your application code to use the new schema

Remember to keep your database schema and application code in sync! 