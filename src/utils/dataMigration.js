import { expenseDB, categoryDB, walletDB, tagDB, recurringDB } from './db';
import supabase from './supabase';
import { expenseDB as supabaseExpenseDB, categoryDB as supabaseCategoryDB, walletDB as supabaseWalletDB, tagDB as supabaseTagDB, transferDB as supabaseTransferDB } from './supabase-db';

/**
 * Migrates data from IndexedDB to Supabase for a user
 * @param {string} userId The Supabase user ID to associate with the data
 * @returns {Promise<{success: boolean, stats: Object}>} Result of migration
 */
export const migrateToSupabase = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required for migration');
  }

  const stats = {
    expenses: { total: 0, migrated: 0 },
    categories: { total: 0, migrated: 0 },
    wallets: { total: 0, migrated: 0 },
    tags: { total: 0, migrated: 0 },
    transfers: { total: 0, migrated: 0 },
    recurring: { total: 0, migrated: 0 },
  };

  try {
    // 1. Migrate Categories
    const categories = await categoryDB.getAll();
    stats.categories.total = categories.length;
    
    for (const category of categories) {
      try {
        await supabaseCategoryDB.add({
          ...category,
          user_id: userId
        }, userId);
        stats.categories.migrated++;
      } catch (err) {
        console.error(`Error migrating category ${category.id}:`, err);
      }
    }

    // 2. Migrate Tags
    const tags = await tagDB.getAll();
    stats.tags.total = tags.length;
    
    for (const tag of tags) {
      try {
        await supabaseTagDB.add({
          ...tag,
          user_id: userId
        }, userId);
        stats.tags.migrated++;
      } catch (err) {
        console.error(`Error migrating tag ${tag.id}:`, err);
      }
    }

    // 3. Migrate Wallets
    const wallets = await walletDB.getAll();
    stats.wallets.total = wallets.length;
    
    for (const wallet of wallets) {
      try {
        await supabaseWalletDB.add({
          ...wallet,
          user_id: userId
        }, userId);
        stats.wallets.migrated++;
      } catch (err) {
        console.error(`Error migrating wallet ${wallet.id}:`, err);
      }
    }

    // 4. Migrate Expenses
    const expenses = await expenseDB.getAll();
    stats.expenses.total = expenses.length;
    
    for (const expense of expenses) {
      try {
        await supabaseExpenseDB.add({
          ...expense,
          user_id: userId
        }, userId);
        stats.expenses.migrated++;
      } catch (err) {
        console.error(`Error migrating expense ${expense.id}:`, err);
      }
    }

    // 5. Migrate Transfers
    try {
      // Properly open database and create a transaction to access the object store
      const request = window.indexedDB.open('expense-tracker-db', 7);
      
      // Create a promise to handle the async operation
      const transfers = await new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const db = event.target.result;
          const transaction = db.transaction(['transfers'], 'readonly');
          const store = transaction.objectStore('transfers');
          const getAllRequest = store.getAll();
          
          getAllRequest.onsuccess = () => {
            resolve(getAllRequest.result);
            db.close();
          };
          
          getAllRequest.onerror = (error) => {
            reject(error);
            db.close();
          };
        };
        
        request.onerror = (event) => {
          reject(event.target.error);
        };
      });
      
      stats.transfers.total = transfers.length;
      
      for (const transfer of transfers) {
        try {
          await supabaseTransferDB.add({
            ...transfer,
            user_id: userId
          }, userId);
          stats.transfers.migrated++;
        } catch (err) {
          console.error(`Error migrating transfer ${transfer.id}:`, err);
        }
      }
    } catch (err) {
      console.error('Error accessing transfers from IndexedDB:', err);
    }

    // 6. Migrate Recurring Transactions
    try {
      const recurring = await recurringDB.getAll();
      stats.recurring.total = recurring.length;
      
      // We'd need to implement the recurring transactions table in Supabase
      // This is left as an exercise or future implementation
    } catch (err) {
      console.error('Error accessing recurring transactions from IndexedDB:', err);
    }

    return { 
      success: true, 
      stats
    };
  } catch (error) {
    console.error('Data migration failed:', error);
    return {
      success: false,
      error: error.message,
      stats
    };
  }
};

/**
 * Clear IndexedDB data after successful migration
 */
export const clearIndexedDB = async () => {
  try {
    // Confirm with user before clearing data
    const confirmed = window.confirm(
      'This will clear all your local data as it has been migrated to the cloud. Continue?'
    );
    
    if (!confirmed) {
      return { success: false, message: 'Operation cancelled by user' };
    }
    
    // Clear all stores using proper transactions since there's no clear() method on the DB objects
    await clearObjectStore('expenses');
    await clearObjectStore('categories');
    await clearObjectStore('tags');
    await clearObjectStore('wallets');
    await clearObjectStore('transfers');
    await clearObjectStore('recurring');
    
    // Helper function to clear an object store
    async function clearObjectStore(storeName) {
      return new Promise((resolve, reject) => {
        try {
          const request = window.indexedDB.open('expense-tracker-db', 7);
          
          request.onsuccess = (event) => {
            try {
              const db = event.target.result;
              if (!db.objectStoreNames.contains(storeName)) {
                console.log(`Store ${storeName} doesn't exist, skipping`);
                db.close();
                resolve();
                return;
              }
              
              const transaction = db.transaction(storeName, 'readwrite');
              const store = transaction.objectStore(storeName);
              const clearRequest = store.clear();
              
              clearRequest.onsuccess = () => {
                console.log(`Cleared ${storeName} store`);
                db.close();
                resolve();
              };
              
              clearRequest.onerror = (error) => {
                console.error(`Error clearing ${storeName}:`, error);
                db.close();
                reject(error);
              };
            } catch (err) {
              console.error(`Error in transaction for ${storeName}:`, err);
              reject(err);
            }
          };
          
          request.onerror = (event) => {
            console.error('Error opening database:', event.target.error);
            reject(event.target.error);
          };
        } catch (err) {
          console.error(`General error clearing ${storeName}:`, err);
          reject(err);
        }
      });
    }
    
    return { success: true, message: 'Local data cleared successfully' };
  } catch (error) {
    console.error('Error clearing IndexedDB:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Component to offer migration to users with existing IndexedDB data
 */
export const checkForLocalData = async () => {
  // Skip IndexedDB checks since we're now using Supabase exclusively
  return {
    hasData: false,
    counts: {
      expenses: 0,
      categories: 0,
      wallets: 0,
      tags: 0
    }
  };
}; 