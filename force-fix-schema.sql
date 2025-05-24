-- Force fix schema issues for Expense Tracker

-- 1. Drop and recreate categories table
DROP TABLE IF EXISTS categories CASCADE;
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT 'blue',
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Drop and recreate tags table
DROP TABLE IF EXISTS tags CASCADE;
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT 'blue',
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Drop and recreate expenses table
DROP TABLE IF EXISTS expenses CASCADE;
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    category TEXT,
    date DATE NOT NULL,
    wallet_id TEXT,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    is_income BOOLEAN DEFAULT FALSE,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Add RLS policies
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "Users can view their own categories"
    ON categories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
    ON categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
    ON categories FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
    ON categories FOR DELETE
    USING (auth.uid() = user_id);

-- Tags policies
CREATE POLICY "Users can view their own tags"
    ON tags FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tags"
    ON tags FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags"
    ON tags FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags"
    ON tags FOR DELETE
    USING (auth.uid() = user_id);

-- Expenses policies
CREATE POLICY "Users can view their own expenses"
    ON expenses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expenses"
    ON expenses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
    ON expenses FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
    ON expenses FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Force schema cache reload using multiple methods
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';

-- 6. Verify tables and policies
SELECT 
    'Categories table:' as check,
    EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'categories'
    ) as table_exists,
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'categories' 
        AND column_name = 'color'
    ) as has_color_column;

SELECT 
    'Tags table:' as check,
    EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'tags'
    ) as table_exists,
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tags' 
        AND column_name = 'color'
    ) as has_color_column;

SELECT 
    'Expenses table:' as check,
    EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'expenses'
    ) as table_exists,
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'expenses' 
        AND column_name = 'wallet_id'
    ) as has_wallet_id_column; 