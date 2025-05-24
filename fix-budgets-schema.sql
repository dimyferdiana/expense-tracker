-- Fix budgets table schema - Add missing columns
-- Run this in your Supabase SQL Editor

DO $$
BEGIN
    RAISE NOTICE 'Fixing budgets table schema...';
    
    -- Check if budgets table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budgets') THEN
        
        -- Add notes column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'budgets' AND column_name = 'notes') THEN
            ALTER TABLE budgets ADD COLUMN notes TEXT;
            RAISE NOTICE 'Added notes column to budgets table';
        ELSE
            RAISE NOTICE 'Notes column already exists in budgets table';
        END IF;
        
        -- Add startDate column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'budgets' AND column_name = 'startDate') THEN
            ALTER TABLE budgets ADD COLUMN "startDate" DATE DEFAULT CURRENT_DATE;
            RAISE NOTICE 'Added startDate column to budgets table';
        ELSE
            RAISE NOTICE 'startDate column already exists in budgets table';
        END IF;
        
        -- Check if we have camelCase createdAt column and add it if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'budgets' AND column_name = 'createdAt') THEN
            ALTER TABLE budgets ADD COLUMN "createdAt" TIMESTAMPTZ DEFAULT NOW();
            RAISE NOTICE 'Added createdAt column to budgets table';
        ELSE
            RAISE NOTICE 'createdAt column already exists in budgets table';
        END IF;
        
        RAISE NOTICE 'Budgets table schema fix completed successfully';
        
    ELSE
        RAISE NOTICE 'Budgets table does not exist - creating with complete schema';
        
        -- Create budgets table with all required columns
        CREATE TABLE budgets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            category TEXT NOT NULL,
            amount DECIMAL(15,2) NOT NULL,
            period TEXT NOT NULL DEFAULT 'monthly',
            notes TEXT,
            "startDate" DATE DEFAULT CURRENT_DATE,
            "createdAt" TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies
        CREATE POLICY "Users can view their own budgets" ON budgets
            FOR SELECT USING (auth.uid() = user_id);
            
        CREATE POLICY "Users can insert their own budgets" ON budgets
            FOR INSERT WITH CHECK (auth.uid() = user_id);
            
        CREATE POLICY "Users can update their own budgets" ON budgets
            FOR UPDATE USING (auth.uid() = user_id);
            
        CREATE POLICY "Users can delete their own budgets" ON budgets
            FOR DELETE USING (auth.uid() = user_id);
            
        RAISE NOTICE 'Created budgets table with complete schema and RLS policies';
    END IF;
    
END $$;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'budgets'
ORDER BY ordinal_position; 