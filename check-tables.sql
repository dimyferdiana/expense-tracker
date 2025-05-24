-- DIAGNOSTIC SQL SCRIPT FOR EXPENSE TRACKER
-- This script helps diagnose schema issues by showing detailed table information

-- Function to get table columns (can be called from JavaScript)
CREATE OR REPLACE FUNCTION get_table_columns(table_name TEXT)
RETURNS TABLE (
    column_name TEXT,
    data_type TEXT,
    is_nullable TEXT,
    column_default TEXT
) LANGUAGE sql SECURITY DEFINER AS $$
    SELECT column_name::TEXT, data_type::TEXT, is_nullable::TEXT, column_default::TEXT
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position;
$$;

-- Function to reload schema cache (can be called from JavaScript)
CREATE OR REPLACE FUNCTION reload_schema_cache()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER AS $$
    SELECT pg_notify('pgrst', 'reload schema')::TEXT;
$$;

-- Check expenses table
SELECT 'EXPENSES TABLE' AS check;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'expenses'
ORDER BY ordinal_position;

-- Check tags table
SELECT 'TAGS TABLE' AS check;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tags'
ORDER BY ordinal_position;

-- Check categories table
SELECT 'CATEGORIES TABLE' AS check;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'categories'
ORDER BY ordinal_position;

-- Check wallets table
SELECT 'WALLETS TABLE' AS check;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'wallets'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 'ROW LEVEL SECURITY POLICIES' AS check;
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('expenses', 'categories', 'tags', 'wallets')
ORDER BY tablename, policyname; 