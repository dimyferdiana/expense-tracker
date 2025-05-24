import supabase from './supabase';

// Function to create database tables if they don't exist
export const initializeSupabaseDatabase = async () => {
  try {
    // Check if we can access the database
    const { data, error } = await supabase.from('expenses').select('count', { count: 'exact' }).limit(1);
    
    if (error && error.code === '42P01') {
      // Table doesn't exist error
      console.error('Database tables do not exist yet. Please run the SQL setup script from MIGRATION-GUIDE.md in the Supabase SQL Editor.');
      return { success: false, message: 'Database tables not found. Please create them using the SQL script in MIGRATION-GUIDE.md.' };
    } else if (error) {
      console.error('Error checking database:', error);
      return { success: false, error };
    }
    
    console.log('Supabase database tables exist and are ready to use.');
    return { success: true };
  } catch (error) {
    console.error('Error initializing Supabase database:', error);
    return { success: false, error };
  }
};

// Expense operations with user_id for data isolation
export const expenseDB = {
  // Get all expenses for current user
  getAll: async (userId) => {
    if (!userId) return [];
    
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting expenses:', error);
      return [];
    }
  },
  
  // Add a new expense
  add: async (expense, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      // Format the expense object to match the database schema
      const expenseData = {
        user_id: userId,
        amount: parseFloat(expense.amount),
        description: expense.description,
        category: expense.category,
        date: expense.date,
        wallet_id: expense.wallet_id, // Use wallet_id consistently
        notes: expense.notes || '',
        tags: expense.tags.map(tag => typeof tag === 'object' ? tag.id : tag) || [],
        is_income: expense.is_income,
        photo_url: expense.photoUrl || null
      };
      
      console.log('Adding expense with data:', expenseData);
      
      const { data, error } = await supabase
        .from('expenses')
        .insert([expenseData])
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  },
  
  // Update an expense
  update: async (expense, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      // Format the expense object to match the database schema
      const expenseData = {
        user_id: userId,
        amount: parseFloat(expense.amount),
        description: expense.description,
        category: expense.category,
        date: expense.date,
        wallet_id: expense.wallet_id,
        notes: expense.notes || '',
        tags: expense.tags.map(tag => typeof tag === 'object' ? tag.id : tag) || [],
        is_income: expense.is_income,
        photo_url: expense.photoUrl || null
      };
      
      const { data, error } = await supabase
        .from('expenses')
        .update(expenseData)
        .eq('id', expense.id)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  },
  
  // Delete an expense
  delete: async (id, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      // Make sure the expense belongs to the user
      const { data: existingExpense, error: fetchError } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
        
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError; // PGRST116 is "row not found"
      if (!existingExpense) throw new Error('Expense not found or unauthorized');
      
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
        
      if (error) throw error;
      return id;
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }
};

// Category operations with user_id for data isolation
export const categoryDB = {
  // Get all categories for current user
  getAll: async (userId) => {
    if (!userId) return [];
    
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId);
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  },
  
  // Add a new category
  add: async (category, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ 
          name: category.name,
          color: category.color || 'blue',
          user_id: userId 
        }])
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  },
  
  // Update a category
  update: async (category, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      // Make sure the category belongs to the user
      const { data: existingCategory, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('id', category.id)
        .eq('user_id', userId)
        .single();
        
      if (fetchError) throw fetchError;
      if (!existingCategory) throw new Error('Category not found or unauthorized');
      
      const { data, error } = await supabase
        .from('categories')
        .update(category)
        .eq('id', category.id)
        .eq('user_id', userId)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  },
  
  // Delete a category
  delete: async (id, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      // Make sure the category belongs to the user
      const { data: existingCategory, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
        
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      if (!existingCategory) throw new Error('Category not found or unauthorized');
      
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
        
      if (error) throw error;
      return id;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }
};

// Similar pattern for other data stores (wallets, transfers, tags, etc.)
export const walletDB = {
  // Get all wallets for current user
  getAll: async (userId) => {
    if (!userId) return [];
    
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId);
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting wallets:', error);
      return [];
    }
  },
  
  // Add a new wallet
  add: async (wallet, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      const { data, error } = await supabase
        .from('wallets')
        .insert([{ ...wallet, user_id: userId }])
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding wallet:', error);
      throw error;
    }
  },
  
  // Update a wallet
  update: async (wallet, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      // Security check
      const { data: existingWallet, error: fetchError } = await supabase
        .from('wallets')
        .select('*')
        .eq('id', wallet.id)
        .eq('user_id', userId)
        .single();
        
      if (fetchError) throw fetchError;
      if (!existingWallet) throw new Error('Wallet not found or unauthorized');
      
      const { data, error } = await supabase
        .from('wallets')
        .update(wallet)
        .eq('id', wallet.id)
        .eq('user_id', userId)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating wallet:', error);
      throw error;
    }
  },
  
  // Delete a wallet
  delete: async (id, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      // Security check
      const { data: existingWallet, error: fetchError } = await supabase
        .from('wallets')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
        
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      if (!existingWallet) throw new Error('Wallet not found or unauthorized');
      
      const { error } = await supabase
        .from('wallets')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
        
      if (error) throw error;
      return id;
    } catch (error) {
      console.error('Error deleting wallet:', error);
      throw error;
    }
  }
};

// Tag operations with user_id for data isolation
export const tagDB = {
  // Get all tags for current user
  getAll: async (userId) => {
    if (!userId) return [];
    
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', userId);
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting tags:', error);
      return [];
    }
  },
  
  // Add a new tag
  add: async (tag, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      const { data, error } = await supabase
        .from('tags')
        .insert([{ 
          name: tag.name, 
          color: tag.color || 'blue', // Ensure color is always set
          user_id: userId 
        }])
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding tag:', error);
      throw error;
    }
  },
  
  // Update a tag
  update: async (tag, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      // Make sure the tag belongs to the user
      const { data: existingTag, error: fetchError } = await supabase
        .from('tags')
        .select('*')
        .eq('id', tag.id)
        .eq('user_id', userId)
        .single();
        
      if (fetchError) throw fetchError;
      if (!existingTag) throw new Error('Tag not found or unauthorized');
      
      const { data, error } = await supabase
        .from('tags')
        .update({
          name: tag.name,
          color: tag.color
        })
        .eq('id', tag.id)
        .eq('user_id', userId)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating tag:', error);
      throw error;
    }
  },
  
  // Delete a tag
  delete: async (id, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      // Make sure the tag belongs to the user
      const { data: existingTag, error: fetchError } = await supabase
        .from('tags')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
        
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      if (!existingTag) throw new Error('Tag not found or unauthorized');
      
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
        
      if (error) throw error;
      return id;
    } catch (error) {
      console.error('Error deleting tag:', error);
      throw error;
    }
  }
};

// Transfer operations with user_id for data isolation
export const transferDB = {
  // Get all transfers for current user
  getAll: async (userId) => {
    if (!userId) return [];
    
    try {
      const { data, error } = await supabase
        .from('transfers')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting transfers:', error);
      return [];
    }
  },
  
  // Get a single transfer by ID
  getById: async (id, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      const { data, error } = await supabase
        .from('transfers')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "row not found"
      return data;
    } catch (error) {
      console.error('Error getting transfer by ID:', error);
      return null;
    }
  },
  
  // Add a new transfer
  add: async (transfer, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      // Map the transfer data to match database schema
      const transferData = {
        user_id: userId,
        from_wallet_id: transfer.fromWallet,
        to_wallet_id: transfer.toWallet,
        amount: parseFloat(transfer.amount),
        date: transfer.date,
        notes: transfer.notes || '',
        photo_url: transfer.photoUrl || '',
        from_wallet_name: transfer.fromWalletName || '',
        to_wallet_name: transfer.toWalletName || '',
        timestamp: transfer.timestamp || new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('transfers')
        .insert([transferData])
        .select()
        .single();
        
      if (error) throw error;
      
      // Map back to expected format for compatibility
      return {
        ...data,
        fromWallet: data.from_wallet_id,
        toWallet: data.to_wallet_id,
        fromWalletName: data.from_wallet_name,
        toWalletName: data.to_wallet_name,
        photoUrl: data.photo_url
      };
    } catch (error) {
      console.error('Error adding transfer:', error);
      throw error;
    }
  },
  
  // Update a transfer
  update: async (transfer, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      // Make sure the transfer belongs to the user
      const { data: existingTransfer, error: fetchError } = await supabase
        .from('transfers')
        .select('*')
        .eq('id', transfer.id)
        .eq('user_id', userId)
        .single();
        
      if (fetchError) throw fetchError;
      if (!existingTransfer) throw new Error('Transfer not found or unauthorized');
      
      // Map the transfer data to match database schema
      const transferData = {
        from_wallet_id: transfer.fromWallet,
        to_wallet_id: transfer.toWallet,
        amount: parseFloat(transfer.amount),
        date: transfer.date,
        notes: transfer.notes || '',
        photo_url: transfer.photoUrl || '',
        from_wallet_name: transfer.fromWalletName || '',
        to_wallet_name: transfer.toWalletName || '',
        timestamp: transfer.timestamp || new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('transfers')
        .update(transferData)
        .eq('id', transfer.id)
        .eq('user_id', userId)
        .select()
        .single();
        
      if (error) throw error;
      
      // Map back to expected format for compatibility
      return {
        ...data,
        fromWallet: data.from_wallet_id,
        toWallet: data.to_wallet_id,
        fromWalletName: data.from_wallet_name,
        toWalletName: data.to_wallet_name,
        photoUrl: data.photo_url
      };
    } catch (error) {
      console.error('Error updating transfer:', error);
      throw error;
    }
  },
  
  // Delete a transfer
  delete: async (id, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      // Make sure the transfer belongs to the user
      const { data: existingTransfer, error: fetchError } = await supabase
        .from('transfers')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
        
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      if (!existingTransfer) throw new Error('Transfer not found or unauthorized');
      
      const { error } = await supabase
        .from('transfers')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
        
      if (error) throw error;
      return id;
    } catch (error) {
      console.error('Error deleting transfer:', error);
      throw error;
    }
  }
};

// Recurring transaction operations with user_id for data isolation
export const recurringDB = {
  // Get all recurring transactions for current user
  getAll: async (userId) => {
    if (!userId) return [];
    
    try {
      const { data, error } = await supabase
        .from('recurring')
        .select('*')
        .eq('user_id', userId)
        .order('nextDate', { ascending: true });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting recurring transactions:', error);
      return [];
    }
  },
  
  // Add a new recurring transaction
  add: async (transaction, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      const { data, error } = await supabase
        .from('recurring')
        .insert([{ ...transaction, user_id: userId }])
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding recurring transaction:', error);
      throw error;
    }
  },
  
  // Update a recurring transaction
  update: async (transaction, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      // Make sure the transaction belongs to the user
      const { data: existingTransaction, error: fetchError } = await supabase
        .from('recurring')
        .select('*')
        .eq('id', transaction.id)
        .eq('user_id', userId)
        .single();
        
      if (fetchError) throw fetchError;
      if (!existingTransaction) throw new Error('Recurring transaction not found or unauthorized');
      
      const { data, error } = await supabase
        .from('recurring')
        .update(transaction)
        .eq('id', transaction.id)
        .eq('user_id', userId)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating recurring transaction:', error);
      throw error;
    }
  },
  
  // Delete a recurring transaction
  delete: async (id, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      // Make sure the transaction belongs to the user
      const { data: existingTransaction, error: fetchError } = await supabase
        .from('recurring')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
        
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      if (!existingTransaction) throw new Error('Recurring transaction not found or unauthorized');
      
      const { error } = await supabase
        .from('recurring')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
        
      if (error) throw error;
      return id;
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
      throw error;
    }
  },
  
  // Get all due recurring transactions
  getDueTransactions: async (userId, date = new Date()) => {
    if (!userId) return [];
    
    const formattedDate = date instanceof Date 
      ? date.toISOString().slice(0, 10) 
      : date;
    
    try {
      const { data, error } = await supabase
        .from('recurring')
        .select('*')
        .eq('user_id', userId)
        .lte('nextDate', formattedDate);
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting due recurring transactions:', error);
      return [];
    }
  }
};

// Budget operations with user_id for data isolation
export const budgetDB = {
  // Get all budgets for current user
  getAll: async (userId) => {
    if (!userId) return [];
    
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting budgets:', error);
      return [];
    }
  },
  
  // Add a new budget
  add: async (budget, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      const { data, error } = await supabase
        .from('budgets')
        .insert([{ ...budget, user_id: userId }])
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding budget:', error);
      throw error;
    }
  },
  
  // Update a budget
  update: async (budget, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      // Make sure the budget belongs to the user
      const { data: existingBudget, error: fetchError } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', budget.id)
        .eq('user_id', userId)
        .single();
        
      if (fetchError) throw fetchError;
      if (!existingBudget) throw new Error('Budget not found or unauthorized');
      
      const { data, error } = await supabase
        .from('budgets')
        .update(budget)
        .eq('id', budget.id)
        .eq('user_id', userId)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating budget:', error);
      throw error;
    }
  },
  
  // Delete a budget
  delete: async (id, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      // Make sure the budget belongs to the user
      const { data: existingBudget, error: fetchError } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
        
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      if (!existingBudget) throw new Error('Budget not found or unauthorized');
      
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
        
      if (error) throw error;
      return id;
    } catch (error) {
      console.error('Error deleting budget:', error);
      throw error;
    }
  }
};

// Add similar patterns for other database entities (budgets, tags, etc.)
// Each function should include user_id filtering for data isolation 