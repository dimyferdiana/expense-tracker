import supabase from './supabase';

// Function to handle network errors gracefully
const handleNetworkError = (error, operation = 'database operation') => {
  console.error(`Network error during ${operation}:`, error);
  
  // Check for specific CORS-related errors
  if (error.message?.includes('NetworkError') || 
      error.message?.includes('CORS') || 
      error.message?.includes('fetch') ||
      error.message?.includes('Cross-Origin') ||
      error.code === 'NETWORK_ERROR') {
    
    console.warn(`🚨 CORS/Network error detected during ${operation}:`, {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    
    return {
      isNetworkError: true,
      isCorsError: true,
      message: 'Network connection issue or CORS error. This might be due to:\n' +
               '1. Internet connectivity problems\n' +
               '2. Supabase project configuration issues\n' +
               '3. Browser blocking the request\n' +
               '4. Invalid API keys or authentication\n' +
               'Please check your connection and try again.',
      troubleshooting: {
        checkConnection: 'Verify internet connectivity',
        checkSupabaseStatus: 'Check if Supabase is accessible at https://status.supabase.com',
        checkApiKeys: 'Verify your Supabase URL and API key are correct',
        checkBrowser: 'Try in a different browser or incognito mode',
        checkConsole: 'Check browser console for detailed error messages'
      },
      originalError: error
    };
  }
  
  return { isNetworkError: false, originalError: error };
};

// Function to create database tables if they don't exist
export const initializeSupabaseDatabase = async () => {
  try {
    // Check if we can access the database
    const { data, error } = await supabase.from('expenses').select('count', { count: 'exact' }).limit(1);
    
    if (error) {
      const networkError = handleNetworkError(error, 'database initialization');
      if (networkError.isNetworkError) {
        return { success: false, message: networkError.message, isNetworkError: true };
      }
      
      if (error.code === '42P01') {
        // Table doesn't exist error
        console.error('Database tables do not exist yet. Please run the SQL setup script from MIGRATION-GUIDE.md in the Supabase SQL Editor.');
        return { success: false, message: 'Database tables not found. Please create them using the SQL script in MIGRATION-GUIDE.md.' };
      } else {
        console.error('Error checking database:', error);
        return { success: false, error };
      }
    }
    
    console.log('Supabase database tables exist and are ready to use.');
    return { success: true };
  } catch (error) {
    const networkError = handleNetworkError(error, 'database initialization');
    if (networkError.isNetworkError) {
      return { success: false, message: networkError.message, isNetworkError: true };
    }
    
    console.error('Error initializing Supabase database:', error);
    return { success: false, error };
  }
};

// Expense operations with user_id for data isolation
export const expenseDB = {
  // Get all active expenses for current user (excluding deleted)
  getAll: async (userId) => {
    if (!userId) return [];
    
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('date', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting expenses:', error);
      return [];
    }
  },
  
  // Get all expenses including deleted (for sync purposes)
  getAllIncludingDeleted: async (userId) => {
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
      console.error('Error getting all expenses:', error);
      return [];
    }
  },

  // Get a single expense by ID
  getById: async (id, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        const networkError = handleNetworkError(error, 'getting expense by ID');
        if (networkError.isNetworkError) {
          console.warn(`Network error getting expense ${id}:`, networkError.message);
          return null; // Return null for network errors to avoid breaking the integrity check
        }
        throw error;
      }
      return data;
    } catch (error) {
      const networkError = handleNetworkError(error, 'getting expense by ID');
      if (networkError.isNetworkError) {
        console.warn(`Network error getting expense ${id}:`, networkError.message);
        return null;
      }
      console.error('Error getting expense by ID:', error);
      return null;
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
        photo_url: expense.photoUrl || null,
        deleted_at: null,
        last_modified: new Date().toISOString(),
        sync_status: 'synced'
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
        photo_url: expense.photoUrl || null,
        last_modified: new Date().toISOString(),
        sync_status: 'synced'
      };
      
      const { data, error } = await supabase
        .from('expenses')
        .update(expenseData)
        .eq('id', expense.id)
        .eq('user_id', userId)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  },
  
  // Soft delete an expense (tombstone pattern)
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
      
      // Mark as deleted instead of removing
      const { error } = await supabase
        .from('expenses')
        .update({ 
          deleted_at: new Date().toISOString(),
          last_modified: new Date().toISOString(),
          sync_status: 'synced'
        })
        .eq('id', id)
        .eq('user_id', userId);
        
      if (error) throw error;
      return id;
    } catch (error) {
      console.error('Error soft deleting expense:', error);
      throw error;
    }
  },
  
  // Hard delete an expense (for cleanup purposes)
  hardDelete: async (id, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
        
      if (error) throw error;
      return id;
    } catch (error) {
      console.error('Error hard deleting expense:', error);
      throw error;
    }
  },
  
  // Restore a deleted expense
  restore: async (id, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      const { data, error } = await supabase
        .from('expenses')
        .update({ 
          deleted_at: null,
          last_modified: new Date().toISOString(),
          sync_status: 'synced'
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error restoring expense:', error);
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
      const categoryData = {
        // If category has an ID, include it for upsert, otherwise let Supabase generate one
        ...(category.id && { id: category.id }), 
        name: category.name.trim(),
        user_id: userId,
        // Ensure other fields like 'color' are handled if they exist on the category object
        ...(category.color && { color: category.color }),
        last_modified: new Date().toISOString(),
        sync_status: 'synced' 
      };
      
      const { data, error } = await supabase
        .from('categories')
        .upsert(categoryData, { onConflict: 'id' }) // Upsert based on ID
        .select()
        .single();
        
      if (error) {
        // Log specific Supabase error for better debugging
        console.error('Supabase error adding/updating category:', error);
        throw error;
      }
      return data;
    } catch (error) {
      // Catch and re-throw for consistent error handling
      console.error('Error in categoryDB.add:', error.message);
      throw new Error(`Failed to add/update category: ${error.message}`);
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
  },

  // Clean up duplicate categories (keep the oldest one for each name)
  cleanupDuplicates: async (userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      // Get all categories for the user
      const { data: allCategories, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      // Group by name (case-insensitive)
      const categoryGroups = {};
      allCategories.forEach(category => {
        const normalizedName = category.name.toLowerCase().trim();
        if (!categoryGroups[normalizedName]) {
          categoryGroups[normalizedName] = [];
        }
        categoryGroups[normalizedName].push(category);
      });
      
      // Find duplicates and delete all but the first (oldest) one
      const duplicatesToDelete = [];
      Object.values(categoryGroups).forEach(group => {
        if (group.length > 1) {
          // Keep the first (oldest), delete the rest
          duplicatesToDelete.push(...group.slice(1));
        }
      });
      
      // Delete duplicates
      for (const duplicate of duplicatesToDelete) {
        await supabase
          .from('categories')
          .delete()
          .eq('id', duplicate.id)
          .eq('user_id', userId);
      }
      
      return {
        duplicatesRemoved: duplicatesToDelete.length,
        duplicateNames: [...new Set(duplicatesToDelete.map(d => d.name))]
      };
    } catch (error) {
      console.error('Error cleaning up duplicate categories:', error);
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
      const walletData = {
        ...wallet, // Spread existing wallet data (id, name, type, balance, etc.)
        user_id: userId,
        last_modified: new Date().toISOString(),
        sync_status: 'synced'
      };

      const { data, error } = await supabase
        .from('wallets')
        .upsert(walletData, { onConflict: 'id' }) // Upsert based on ID
        .select()
        .single();
        
      if (error) {
        console.error('Supabase error adding/updating wallet:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error in walletDB.add:', error.message);
      throw new Error(`Failed to add/update wallet: ${error.message}`);
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

  // Get a single tag by ID
  getById: async (id, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        const networkError = handleNetworkError(error, 'getting tag by ID');
        if (networkError.isNetworkError) {
          console.warn(`Network error getting tag ${id}:`, networkError.message);
          return null; // Return null for network errors to avoid breaking the integrity check
        }
        throw error;
      }
      return data;
    } catch (error) {
      const networkError = handleNetworkError(error, 'getting tag by ID');
      if (networkError.isNetworkError) {
        console.warn(`Network error getting tag ${id}:`, networkError.message);
        return null;
      }
      console.error('Error getting tag by ID:', error);
      return null;
    }
  },
  
  // Add a new tag
  add: async (tag, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      const tagData = {
        ...(tag.id && { id: tag.id }), // If tag has an ID, include it for upsert
        name: tag.name.trim(),
        user_id: userId,
        // Ensure color field is handled if it exists on the tag object
        ...(tag.color && { color: tag.color }),
        last_modified: new Date().toISOString(),
        sync_status: 'synced' 
      };
      
      const { data, error } = await supabase
        .from('tags')
        .upsert(tagData, { onConflict: 'id' }) // Upsert based on ID
        .select()
        .single();
        
      if (error) {
        console.error('Supabase error adding/updating tag:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error in tagDB.add:', error.message);
      throw new Error(`Failed to add/update tag: ${error.message}`);
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
      
      // Prepare update data with all relevant fields
      const updateData = {
        name: tag.name.trim(),
        ...(tag.color && { color: tag.color }),
        last_modified: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('tags')
        .update(updateData)
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
  },

  // Clean up duplicate tags (keep the oldest one for each name)
  cleanupDuplicates: async (userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      // Get all tags for the user
      const { data: allTags, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      // Group by name (case-insensitive)
      const tagGroups = {};
      allTags.forEach(tag => {
        const normalizedName = tag.name.toLowerCase().trim();
        if (!tagGroups[normalizedName]) {
          tagGroups[normalizedName] = [];
        }
        tagGroups[normalizedName].push(tag);
      });
      
      // Find duplicates and delete all but the first (oldest) one
      const duplicatesToDelete = [];
      Object.values(tagGroups).forEach(group => {
        if (group.length > 1) {
          // Keep the first (oldest), delete the rest
          duplicatesToDelete.push(...group.slice(1));
        }
      });
      
      // Delete duplicates
      for (const duplicate of duplicatesToDelete) {
        await supabase
          .from('tags')
          .delete()
          .eq('id', duplicate.id)
          .eq('user_id', userId);
      }
      
      return {
        duplicatesRemoved: duplicatesToDelete.length,
        duplicateNames: [...new Set(duplicatesToDelete.map(d => d.name))]
      };
    } catch (error) {
      console.error('Error cleaning up duplicate tags:', error);
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
        .order('next_date', { ascending: true });
        
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
        .lte('next_date', formattedDate);
        
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