-- Fix Supabase Database Schema Issues
-- Run this in your Supabase SQL Editor

-- 1. Fix transfers table - ensure correct column names
DO $$ 
BEGIN
    -- Check if transfers table exists and has wrong column names
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transfers') THEN
        -- Check if we have the wrong column names and fix them
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'transfers' AND column_name = 'fromWallet') THEN
            
            -- Rename columns to match expected schema
            ALTER TABLE transfers RENAME COLUMN "fromWallet" TO from_wallet_id;
            ALTER TABLE transfers RENAME COLUMN "toWallet" TO to_wallet_id;
            ALTER TABLE transfers RENAME COLUMN "fromWalletName" TO from_wallet_name;
            ALTER TABLE transfers RENAME COLUMN "toWalletName" TO to_wallet_name;
            ALTER TABLE transfers RENAME COLUMN "photoUrl" TO photo_url;
            
            RAISE NOTICE 'Fixed transfers table column names';
        END IF;
    ELSE
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
        
        -- Enable RLS
        ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies
        CREATE POLICY "Users can view their own transfers" ON transfers
            FOR SELECT USING (auth.uid() = user_id);
            
        CREATE POLICY "Users can insert their own transfers" ON transfers
            FOR INSERT WITH CHECK (auth.uid() = user_id);
            
        CREATE POLICY "Users can update their own transfers" ON transfers
            FOR UPDATE USING (auth.uid() = user_id);
            
        CREATE POLICY "Users can delete their own transfers" ON transfers
            FOR DELETE USING (auth.uid() = user_id);
            
        RAISE NOTICE 'Created transfers table with correct schema';
    END IF;
END $$;

-- 2. Create recurring table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recurring') THEN
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
            
        RAISE NOTICE 'Created recurring table';
    END IF;
END $$;

-- 3. Fix budgets table - add missing createdAt column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'budgets') THEN
        -- Check if createdAt column is missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'budgets' AND column_name = 'createdAt') THEN
            -- Add the missing column
            ALTER TABLE budgets ADD COLUMN "createdAt" TIMESTAMPTZ DEFAULT NOW();
            RAISE NOTICE 'Added createdAt column to budgets table';
        END IF;
    END IF;
END $$;

-- 4. Update any existing data to match new schema
UPDATE transfers SET created_at = NOW() WHERE created_at IS NULL;

-- Show completion message
DO $$
BEGIN
    RAISE NOTICE 'Database schema fixes completed successfully!';
END $$; 