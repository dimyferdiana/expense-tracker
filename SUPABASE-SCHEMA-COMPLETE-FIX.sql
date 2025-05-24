-- COMPREHENSIVE SUPABASE DATABASE SCHEMA FIX
-- Run this in your Supabase SQL Editor

-- First, let's check what tables exist and their structure
DO $$
BEGIN
    RAISE NOTICE 'Starting comprehensive database schema fix...';
END $$;

-- 1. Fix transfers table - more comprehensive approach
DO $$ 
BEGIN
    -- Check if transfers table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transfers') THEN
        RAISE NOTICE 'Transfers table exists. Checking column structure...';
        
        -- Check if we have the old column names and need to rename them
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' AND table_name = 'transfers' AND column_name = 'fromWallet') THEN
            
            RAISE NOTICE 'Found old column names. Renaming columns...';
            -- Rename columns to match expected schema
            ALTER TABLE transfers RENAME COLUMN "fromWallet" TO from_wallet_id;
            ALTER TABLE transfers RENAME COLUMN "toWallet" TO to_wallet_id;
            
            -- Handle optional columns that might not exist
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'transfers' AND column_name = 'fromWalletName') THEN
                ALTER TABLE transfers RENAME COLUMN "fromWalletName" TO from_wallet_name;
            END IF;
            
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'transfers' AND column_name = 'toWalletName') THEN
                ALTER TABLE transfers RENAME COLUMN "toWalletName" TO to_wallet_name;
            END IF;
            
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'transfers' AND column_name = 'photoUrl') THEN
                ALTER TABLE transfers RENAME COLUMN "photoUrl" TO photo_url;
            END IF;
            
            RAISE NOTICE 'Successfully renamed transfer table columns';
            
        ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_schema = 'public' AND table_name = 'transfers' AND column_name = 'from_wallet_id') THEN
            
            RAISE NOTICE 'Transfers table has wrong structure. Recreating...';
            -- Drop the existing table and recreate with correct structure
            DROP TABLE transfers CASCADE;
            
            -- Create new transfers table
            CREATE TABLE transfers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
                from_wallet_id TEXT NOT NULL,
                to_wallet_id TEXT NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                date DATE NOT NULL DEFAULT CURRENT_DATE,
                notes TEXT,
                photo_url TEXT,
                from_wallet_name TEXT,
                to_wallet_name TEXT,
                timestamp TIMESTAMPTZ DEFAULT NOW(),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            
            RAISE NOTICE 'Recreated transfers table with correct schema';
        ELSE
            RAISE NOTICE 'Transfers table already has correct column structure';
        END IF;
        
    ELSE
        RAISE NOTICE 'Transfers table does not exist. Creating...';
        -- Create transfers table with correct schema
        CREATE TABLE transfers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            from_wallet_id TEXT NOT NULL,
            to_wallet_id TEXT NOT NULL,
            amount DECIMAL(15,2) NOT NULL,
            date DATE NOT NULL DEFAULT CURRENT_DATE,
            notes TEXT,
            photo_url TEXT,
            from_wallet_name TEXT,
            to_wallet_name TEXT,
            timestamp TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        RAISE NOTICE 'Created new transfers table';
    END IF;
    
    -- Ensure RLS is enabled and policies exist
    ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own transfers" ON transfers;
    DROP POLICY IF EXISTS "Users can insert their own transfers" ON transfers;
    DROP POLICY IF EXISTS "Users can update their own transfers" ON transfers;
    DROP POLICY IF EXISTS "Users can delete their own transfers" ON transfers;
    
    -- Create RLS policies
    CREATE POLICY "Users can view their own transfers" ON transfers
        FOR SELECT USING (auth.uid() = user_id);
        
    CREATE POLICY "Users can insert their own transfers" ON transfers
        FOR INSERT WITH CHECK (auth.uid() = user_id);
        
    CREATE POLICY "Users can update their own transfers" ON transfers
        FOR UPDATE USING (auth.uid() = user_id);
        
    CREATE POLICY "Users can delete their own transfers" ON transfers
        FOR DELETE USING (auth.uid() = user_id);
        
    RAISE NOTICE 'RLS policies configured for transfers table';
END $$;

-- 2. Create recurring table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recurring') THEN
        RAISE NOTICE 'Creating recurring table...';
        
        CREATE TABLE recurring (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            amount DECIMAL(15,2) NOT NULL,
            category TEXT,
            wallet_id TEXT,
            frequency TEXT NOT NULL DEFAULT 'monthly',
            start_date DATE NOT NULL DEFAULT CURRENT_DATE,
            next_date DATE NOT NULL DEFAULT CURRENT_DATE,
            is_income BOOLEAN DEFAULT FALSE,
            notes TEXT,
            tags TEXT[] DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE recurring ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies
        CREATE POLICY "Users can view their own recurring transactions" ON recurring
            FOR SELECT USING (auth.uid() = user_id);
            
        CREATE POLICY "Users can insert their own recurring transactions" ON recurring
            FOR INSERT WITH CHECK (auth.uid() = user_id);
            
        CREATE POLICY "Users can update their own recurring transactions" ON recurring
            FOR UPDATE USING (auth.uid() = user_id);
            
        CREATE POLICY "Users can delete their own recurring transactions" ON recurring
            FOR DELETE USING (auth.uid() = user_id);
            
        RAISE NOTICE 'Created recurring table with RLS policies';
    ELSE
        RAISE NOTICE 'Recurring table already exists';
    END IF;
END $$;

-- 3. Fix budgets table - add missing createdAt column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budgets') THEN
        -- Check if createdAt column is missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'budgets' AND column_name = 'createdAt') THEN
            -- Add the missing column
            ALTER TABLE budgets ADD COLUMN "createdAt" TIMESTAMPTZ DEFAULT NOW();
            RAISE NOTICE 'Added createdAt column to budgets table';
        ELSE
            RAISE NOTICE 'Budgets table already has createdAt column';
        END IF;
    ELSE
        RAISE NOTICE 'Budgets table does not exist - will be created when needed';
    END IF;
END $$;

-- 4. Ensure all required tables exist with basic structure
DO $$
BEGIN
    -- Check and create expenses table if needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
        RAISE NOTICE 'Creating expenses table...';
        CREATE TABLE expenses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            amount DECIMAL(15,2) NOT NULL,
            description TEXT NOT NULL,
            category TEXT,
            date DATE NOT NULL DEFAULT CURRENT_DATE,
            wallet_id TEXT NOT NULL,
            notes TEXT,
            tags TEXT[] DEFAULT '{}',
            is_income BOOLEAN DEFAULT FALSE,
            photo_url TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can manage their own expenses" ON expenses USING (auth.uid() = user_id);
    END IF;
    
    -- Check and create wallets table if needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wallets') THEN
        RAISE NOTICE 'Creating wallets table...';
        CREATE TABLE wallets (
            id TEXT PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'cash',
            balance DECIMAL(15,2) DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can manage their own wallets" ON wallets USING (auth.uid() = user_id);
    END IF;
    
    -- Check and create categories table if needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') THEN
        RAISE NOTICE 'Creating categories table...';
        CREATE TABLE categories (
            id TEXT PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            color TEXT DEFAULT 'blue',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can manage their own categories" ON categories USING (auth.uid() = user_id);
    END IF;
    
    -- Check and create tags table if needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tags') THEN
        RAISE NOTICE 'Creating tags table...';
        CREATE TABLE tags (
            id TEXT PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            color TEXT DEFAULT 'blue',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can manage their own tags" ON tags USING (auth.uid() = user_id);
    END IF;
END $$;

-- 5. Clear any cached schema information (force refresh)
NOTIFY pgrst, 'reload schema';

-- 6. Show final status
DO $$
BEGIN
    RAISE NOTICE '=== SCHEMA FIX COMPLETED ===';
    RAISE NOTICE 'All tables have been created/updated with correct structure';
    RAISE NOTICE 'RLS policies have been configured';
    RAISE NOTICE 'Schema cache has been refreshed';
    RAISE NOTICE 'You can now test wallet transfers!';
END $$; 