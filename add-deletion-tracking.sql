-- Migration script to add deletion tracking to existing Supabase tables
-- Run this in your Supabase SQL Editor to add deletion tracking to existing tables

-- Add deletion tracking columns to expenses table
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced';

-- Add deletion tracking columns to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced';

-- Add deletion tracking columns to tags table
ALTER TABLE tags 
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced';

-- Add deletion tracking columns to wallets table
ALTER TABLE wallets 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced';

-- Add deletion tracking columns to transfers table
ALTER TABLE transfers 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced';

-- Add deletion tracking columns to budgets table
ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON expenses(deleted_at);
CREATE INDEX IF NOT EXISTS idx_expenses_last_modified ON expenses(last_modified);
CREATE INDEX IF NOT EXISTS idx_expenses_sync_status ON expenses(sync_status);

CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON categories(deleted_at);
CREATE INDEX IF NOT EXISTS idx_categories_last_modified ON categories(last_modified);

CREATE INDEX IF NOT EXISTS idx_tags_deleted_at ON tags(deleted_at);
CREATE INDEX IF NOT EXISTS idx_tags_last_modified ON tags(last_modified);

CREATE INDEX IF NOT EXISTS idx_wallets_deleted_at ON wallets(deleted_at);
CREATE INDEX IF NOT EXISTS idx_wallets_last_modified ON wallets(last_modified);

CREATE INDEX IF NOT EXISTS idx_transfers_deleted_at ON transfers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_transfers_last_modified ON transfers(last_modified);

CREATE INDEX IF NOT EXISTS idx_budgets_deleted_at ON budgets(deleted_at);
CREATE INDEX IF NOT EXISTS idx_budgets_last_modified ON budgets(last_modified);

-- Update existing records to have proper timestamps
-- Use conditional logic to handle cases where updated_at column might not exist

-- Update expenses (has updated_at column)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'updated_at') THEN
        UPDATE expenses SET last_modified = COALESCE(updated_at, created_at, NOW()) WHERE last_modified IS NULL;
    ELSE
        UPDATE expenses SET last_modified = COALESCE(created_at, NOW()) WHERE last_modified IS NULL;
    END IF;
END $$;

-- Update categories (no updated_at column)
UPDATE categories SET last_modified = COALESCE(created_at, NOW()) WHERE last_modified IS NULL;

-- Update tags (no updated_at column)
UPDATE tags SET last_modified = COALESCE(created_at, NOW()) WHERE last_modified IS NULL;

-- Update wallets (has updated_at column)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'updated_at') THEN
        UPDATE wallets SET last_modified = COALESCE(updated_at, created_at, NOW()) WHERE last_modified IS NULL;
    ELSE
        UPDATE wallets SET last_modified = COALESCE(created_at, NOW()) WHERE last_modified IS NULL;
    END IF;
END $$;

-- Update transfers (may or may not have updated_at column depending on schema version)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transfers' AND column_name = 'updated_at') THEN
        UPDATE transfers SET last_modified = COALESCE(updated_at, created_at, NOW()) WHERE last_modified IS NULL;
    ELSE
        UPDATE transfers SET last_modified = COALESCE(created_at, NOW()) WHERE last_modified IS NULL;
    END IF;
END $$;

-- Update budgets (has updated_at column)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'updated_at') THEN
        UPDATE budgets SET last_modified = COALESCE(updated_at, created_at, NOW()) WHERE last_modified IS NULL;
    ELSE
        UPDATE budgets SET last_modified = COALESCE(created_at, NOW()) WHERE last_modified IS NULL;
    END IF;
END $$;

-- Create triggers to automatically update last_modified timestamp
CREATE OR REPLACE FUNCTION update_last_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_modified = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist to avoid conflicts
DROP TRIGGER IF EXISTS update_expenses_last_modified ON expenses;
DROP TRIGGER IF EXISTS update_categories_last_modified ON categories;
DROP TRIGGER IF EXISTS update_tags_last_modified ON tags;
DROP TRIGGER IF EXISTS update_wallets_last_modified ON wallets;
DROP TRIGGER IF EXISTS update_transfers_last_modified ON transfers;
DROP TRIGGER IF EXISTS update_budgets_last_modified ON budgets;

-- Apply triggers to all tables
CREATE TRIGGER update_expenses_last_modified BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_last_modified_column();
CREATE TRIGGER update_categories_last_modified BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_last_modified_column();
CREATE TRIGGER update_tags_last_modified BEFORE UPDATE ON tags FOR EACH ROW EXECUTE FUNCTION update_last_modified_column();
CREATE TRIGGER update_wallets_last_modified BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_last_modified_column();
CREATE TRIGGER update_transfers_last_modified BEFORE UPDATE ON transfers FOR EACH ROW EXECUTE FUNCTION update_last_modified_column();
CREATE TRIGGER update_budgets_last_modified BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_last_modified_column();

-- Add comments for documentation
COMMENT ON COLUMN expenses.deleted_at IS 'Timestamp when the expense was soft deleted (NULL if active)';
COMMENT ON COLUMN expenses.last_modified IS 'Timestamp of last modification for sync purposes';
COMMENT ON COLUMN expenses.sync_status IS 'Sync status: pending, synced, conflict';

COMMENT ON COLUMN categories.deleted_at IS 'Timestamp when the category was soft deleted (NULL if active)';
COMMENT ON COLUMN categories.last_modified IS 'Timestamp of last modification for sync purposes';
COMMENT ON COLUMN categories.sync_status IS 'Sync status: pending, synced, conflict';

COMMENT ON COLUMN tags.deleted_at IS 'Timestamp when the tag was soft deleted (NULL if active)';
COMMENT ON COLUMN tags.last_modified IS 'Timestamp of last modification for sync purposes';
COMMENT ON COLUMN tags.sync_status IS 'Sync status: pending, synced, conflict';

COMMENT ON COLUMN wallets.deleted_at IS 'Timestamp when the wallet was soft deleted (NULL if active)';
COMMENT ON COLUMN wallets.last_modified IS 'Timestamp of last modification for sync purposes';
COMMENT ON COLUMN wallets.sync_status IS 'Sync status: pending, synced, conflict';

COMMENT ON COLUMN transfers.deleted_at IS 'Timestamp when the transfer was soft deleted (NULL if active)';
COMMENT ON COLUMN transfers.last_modified IS 'Timestamp of last modification for sync purposes';
COMMENT ON COLUMN transfers.sync_status IS 'Sync status: pending, synced, conflict';

COMMENT ON COLUMN budgets.deleted_at IS 'Timestamp when the budget was soft deleted (NULL if active)';
COMMENT ON COLUMN budgets.last_modified IS 'Timestamp of last modification for sync purposes';
COMMENT ON COLUMN budgets.sync_status IS 'Sync status: pending, synced, conflict'; 