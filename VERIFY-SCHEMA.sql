-- VERIFICATION SCRIPT
-- Run this after the schema fix to verify everything is correct

-- Check transfers table structure
SELECT 
    'transfers' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'transfers'
ORDER BY ordinal_position;

-- Check if the specific columns we need exist
DO $$
BEGIN
    -- Check for required columns
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = 'transfers' AND column_name = 'from_wallet_id') THEN
        RAISE NOTICE '✅ from_wallet_id column exists';
    ELSE
        RAISE NOTICE '❌ from_wallet_id column MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = 'transfers' AND column_name = 'to_wallet_id') THEN
        RAISE NOTICE '✅ to_wallet_id column exists';
    ELSE
        RAISE NOTICE '❌ to_wallet_id column MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = 'transfers' AND column_name = 'user_id') THEN
        RAISE NOTICE '✅ user_id column exists';
    ELSE
        RAISE NOTICE '❌ user_id column MISSING';
    END IF;
END $$;

-- Check all required tables exist
DO $$
BEGIN
    RAISE NOTICE '=== TABLE EXISTENCE CHECK ===';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transfers') THEN
        RAISE NOTICE '✅ transfers table exists';
    ELSE
        RAISE NOTICE '❌ transfers table MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recurring') THEN
        RAISE NOTICE '✅ recurring table exists';
    ELSE
        RAISE NOTICE '❌ recurring table MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
        RAISE NOTICE '✅ expenses table exists';
    ELSE
        RAISE NOTICE '❌ expenses table MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wallets') THEN
        RAISE NOTICE '✅ wallets table exists';
    ELSE
        RAISE NOTICE '❌ wallets table MISSING';
    END IF;
    
    RAISE NOTICE '=== VERIFICATION COMPLETE ===';
END $$; 