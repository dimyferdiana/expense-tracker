-- Sample data for testing - Replace 'your-user-id' with the actual user ID
-- You can get your user ID by running: SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- Sample categories
INSERT INTO categories (id, user_id, name, color)
VALUES 
  ('food', 'your-user-id', 'Food', 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'),
  ('transportation', 'your-user-id', 'Transportation', 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'),
  ('entertainment', 'your-user-id', 'Entertainment', 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'),
  ('utilities', 'your-user-id', 'Utilities', 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'),
  ('housing', 'your-user-id', 'Housing', 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300')
ON CONFLICT (id) DO NOTHING;

-- Sample tags
INSERT INTO tags (id, user_id, name, color)
VALUES 
  ('essential', 'your-user-id', 'Essential', 'blue'),
  ('recurring', 'your-user-id', 'Recurring', 'green'),
  ('emergency', 'your-user-id', 'Emergency', 'red'),
  ('personal', 'your-user-id', 'Personal', 'purple'),
  ('work', 'your-user-id', 'Work', 'indigo')
ON CONFLICT (id) DO NOTHING;

-- Sample wallets
INSERT INTO wallets (id, user_id, name, type, balance)
VALUES 
  ('cash', 'your-user-id', 'Cash', 'cash', 500000),
  ('bank', 'your-user-id', 'Bank Account', 'bank', 2500000),
  ('credit', 'your-user-id', 'Credit Card', 'credit_card', 0),
  ('ewallet', 'your-user-id', 'E-Wallet', 'e_wallet', 150000)
ON CONFLICT (id) DO NOTHING;

-- Sample expenses
INSERT INTO expenses (user_id, amount, description, category, date, walletId, isIncome, notes, tags)
VALUES 
  ('your-user-id', 75000, 'Lunch with colleagues', 'food', CURRENT_DATE - INTERVAL '2 days', 'cash', FALSE, 'Business lunch', ARRAY['work', 'essential']),
  ('your-user-id', 250000, 'Electricity bill', 'utilities', CURRENT_DATE - INTERVAL '5 days', 'bank', FALSE, 'Monthly bill', ARRAY['recurring', 'essential']),
  ('your-user-id', 2500000, 'Rent payment', 'housing', CURRENT_DATE - INTERVAL '10 days', 'bank', FALSE, 'Monthly rent', ARRAY['recurring', 'essential']),
  ('your-user-id', 3500000, 'Salary deposit', 'income', CURRENT_DATE - INTERVAL '15 days', 'bank', TRUE, 'Monthly salary', ARRAY['recurring', 'work']); 