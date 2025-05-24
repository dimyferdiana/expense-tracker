-- Add row-level security (RLS) policies
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own expenses" ON expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own expenses" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own expenses" ON expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own expenses" ON expenses FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own categories" ON categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own categories" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own categories" ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own categories" ON categories FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own tags" ON tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tags" ON tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tags" ON tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tags" ON tags FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own wallets" ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own wallets" ON wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own wallets" ON wallets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own wallets" ON wallets FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own transfers" ON transfers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transfers" ON transfers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transfers" ON transfers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transfers" ON transfers FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own budgets" ON budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own budgets" ON budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own budgets" ON budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own budgets" ON budgets FOR DELETE USING (auth.uid() = user_id); 