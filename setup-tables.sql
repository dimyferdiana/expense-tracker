-- Create expenses table
CREATE TABLE public.expenses (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT,
  category TEXT,
  date DATE NOT NULL,
  walletId TEXT NOT NULL,
  isIncome BOOLEAN DEFAULT FALSE,
  notes TEXT,
  photoUrl TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create categories table
CREATE TABLE public.categories (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tags table
CREATE TABLE public.tags (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wallets table
CREATE TABLE public.wallets (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  balance DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transfers table
CREATE TABLE public.transfers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fromWallet TEXT NOT NULL,
  fromWalletName TEXT,
  toWallet TEXT NOT NULL,
  toWalletName TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  photoUrl TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create budgets table
CREATE TABLE public.budgets (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  period TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add row-level security (RLS) policies
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own expenses" ON public.expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own expenses" ON public.expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own expenses" ON public.expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own expenses" ON public.expenses FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own categories" ON public.categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own categories" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own categories" ON public.categories FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own tags" ON public.tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tags" ON public.tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tags" ON public.tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tags" ON public.tags FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own wallets" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own wallets" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own wallets" ON public.wallets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own wallets" ON public.wallets FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own transfers" ON public.transfers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transfers" ON public.transfers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transfers" ON public.transfers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transfers" ON public.transfers FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own budgets" ON public.budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own budgets" ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own budgets" ON public.budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own budgets" ON public.budgets FOR DELETE USING (auth.uid() = user_id); 