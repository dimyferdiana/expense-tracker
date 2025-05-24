-- SPECIFIC FIX FOR BUDGETS TABLE
-- Run this in your Supabase SQL Editor

DO $$
BEGIN
    RAISE NOTICE 'Starting budgets table fix...';
    
    -- Check if budgets table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budgets') THEN
        RAISE NOTICE 'Budgets table exists. Checking and adding missing columns...';
        
        -- Add notes column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'budgets' AND column_name = 'notes') THEN
            ALTER TABLE budgets ADD COLUMN notes TEXT;
            RAISE NOTICE 'Added notes column to budgets table';
        ELSE
            RAISE NOTICE 'Notes column already exists in budgets table';
        END IF;
        
        -- Add startDate column if it doesn't exist (using quoted name to match frontend)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'budgets' AND column_name = 'startDate') THEN
            ALTER TABLE budgets ADD COLUMN "startDate" DATE;
            RAISE NOTICE 'Added startDate column to budgets table';
        ELSE
            RAISE NOTICE 'startDate column already exists in budgets table';
        END IF;
        
        -- Add createdAt column if it doesn't exist (using quoted name to match frontend)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'budgets' AND column_name = 'createdAt') THEN
            ALTER TABLE budgets ADD COLUMN "createdAt" TIMESTAMPTZ DEFAULT NOW();
            RAISE NOTICE 'Added createdAt column to budgets table';
        ELSE
            RAISE NOTICE 'createdAt column already exists in budgets table';
        END IF;
        
    ELSE
        RAISE NOTICE 'Budgets table does not exist. Creating with correct schema...';
        
        -- Create budgets table with all required columns
        CREATE TABLE budgets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            category TEXT NOT NULL,
            amount DECIMAL(15,2) NOT NULL,
            period TEXT NOT NULL DEFAULT 'monthly',
            "startDate" DATE DEFAULT CURRENT_DATE,
            notes TEXT,
            "createdAt" TIMESTAMPTZ DEFAULT NOW()
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
            
        RAISE NOTICE 'Created budgets table with RLS policies';
    END IF;
    
    -- Force schema cache refresh
    NOTIFY pgrst, 'reload schema';
    
    RAISE NOTICE 'Budgets table fix completed successfully!';
END $$;

-- Show the current budgets table structure for verification
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'budgets'
ORDER BY ordinal_position; 