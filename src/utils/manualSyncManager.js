/**
 * Manual-Only Sync Manager for Expense Tracker
 * NO AUTOMATIC SYNC - All operations are user-controlled
 * Offline-first with optional cloud backup
 */
import { 
  expenseDB as localExpenseDB,
  categoryDB as localCategoryDB,
  walletDB as localWalletDB,
  transferDB as localTransferDB,
  budgetDB as localBudgetDB,
  tagDB as localTagDB,
  recurringDB as localRecurringDB
} from './db';
import { safeSetItem } from './safeStorage';

import {
  expenseDB as supabaseExpenseDB,
  categoryDB as supabaseCategoryDB,
  walletDB as supabaseWalletDB,
  transferDB as supabaseTransferDB,
  budgetDB as supabaseBudgetDB,
  tagDB as supabaseTagDB,
  recurringDB as supabaseRecurringDB
} from './supabase-db';

export class ManualSyncManager {
  constructor(user) {
    this.user = user;
    this.status = {
      lastManualSync: this.getLastSyncTime(),
      hasLocalChanges: this.hasLocalChanges(),
      isOnline: navigator.onLine,
      manualSyncInProgress: false,
      localDataCount: {},
      cloudDataCount: {},
      errors: [],
      dataAge: null,
      storageUsage: null
    };

    // Listen for online/offline events (for UI indicators only)
    window.addEventListener('online', this.handleOnlineStatusChange.bind(this));
    window.addEventListener('offline', this.handleOnlineStatusChange.bind(this));
    
    // Initialize local database
    this.initializeLocalDatabase();
    
    // Update local data count
    this.updateLocalDataCount();
    
    // Set up beforeunload warning
    this.setupBeforeUnloadWarning();
  }

  async initializeLocalDatabase() {
    try {
      const { initializeDatabase } = await import('./db');
      const initialized = await initializeDatabase();
      if (!initialized) {
        console.warn('Local database initialization failed');
      } else {
        console.log('✅ Local database initialized successfully');
      }
    } catch (error) {
      console.error('❌ Error initializing local database:', error);
    }
  }

  async updateLocalDataCount() {
    try {
      const [expenses, categories, wallets, transfers, budgets, tags, recurring] = await Promise.all([
        localExpenseDB.getAll(),
        localCategoryDB.getAll(),
        localWalletDB.getAll(),
        localTransferDB.getAll(),
        localBudgetDB.getAll(),
        localTagDB.getAll(),
        localRecurringDB.getAll()
      ]);

      this.status.localDataCount = {
        expenses: expenses.length,
        categories: categories.length,
        wallets: wallets.length,
        transfers: transfers.length,
        budgets: budgets.length,
        tags: tags.length,
        recurring: recurring.length,
        total: expenses.length + categories.length + wallets.length + transfers.length + budgets.length + tags.length + recurring.length
      };
      
      this.saveStatusToLocalStorage();
    } catch (error) {
      console.error('Error counting local data:', error);
    }
  }

  getStatus() {
    return this.status;
  }

  handleOnlineStatusChange() {
    this.status.isOnline = navigator.onLine;
    this.saveStatusToLocalStorage();
  }

  getLastSyncTime() {
    return localStorage.getItem('lastManualSyncTime') || null;
  }

  hasLocalChanges() {
    return localStorage.getItem('hasLocalChanges') === 'true';
  }

  markLocalChange() {
    this.status.hasLocalChanges = true;
    safeSetItem('hasLocalChanges', 'true');
    this.saveStatusToLocalStorage();
    this.updateLocalDataCount();
  }

  clearLocalChanges() {
    this.status.hasLocalChanges = false;
    localStorage.removeItem('hasLocalChanges');
    this.saveStatusToLocalStorage();
  }

  saveStatusToLocalStorage() {
    safeSetItem('manualSyncStatus', JSON.stringify(this.status));
    if (this.status.lastManualSync) {
      safeSetItem('lastManualSyncTime', this.status.lastManualSync);
    }
  }

  setupBeforeUnloadWarning() {
    window.addEventListener('beforeunload', (event) => {
      if (this.status.hasLocalChanges) {
        const message = 'You have unsaved changes. Consider backing up your data before leaving.';
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    });
  }

  /**
   * MANUAL UPLOAD - User explicitly chooses to upload to cloud
   */
  async manualUploadToCloud(options = {}) {
    const { 
      skipValidation = false,
      showProgress = true 
    } = options;

    if (!this.status.isOnline) {
      throw new Error('Cannot upload while offline. Please check your internet connection.');
    }

    if (!this.user?.id) {
      throw new Error('User not authenticated. Please sign in to upload to cloud.');
    }

    this.status.manualSyncInProgress = true;
    this.status.errors = [];
    this.saveStatusToLocalStorage();

    try {
      console.log('🚀 Starting manual upload to cloud...');
      
      const stats = {
        expenses: { uploaded: 0, errors: 0 },
        categories: { uploaded: 0, errors: 0 },
        wallets: { uploaded: 0, errors: 0 },
        transfers: { uploaded: 0, errors: 0 },
        budgets: { uploaded: 0, errors: 0 },
        tags: { uploaded: 0, errors: 0 },
        recurring: { uploaded: 0, errors: 0 }
      };

      // Upload each data type in dependency order
      await this.uploadDataType('categories', localCategoryDB, supabaseCategoryDB, stats);
      await this.uploadDataType('tags', localTagDB, supabaseTagDB, stats);
      await this.uploadDataType('wallets', localWalletDB, supabaseWalletDB, stats);
      await this.uploadDataType('budgets', localBudgetDB, supabaseBudgetDB, stats);
      await this.uploadDataType('recurring', localRecurringDB, supabaseRecurringDB, stats);
      await this.uploadDataType('transfers', localTransferDB, supabaseTransferDB, stats);
      await this.uploadDataType('expenses', localExpenseDB, supabaseExpenseDB, stats);

      this.status.lastManualSync = new Date().toISOString();
      this.clearLocalChanges();
      
      console.log('✅ Manual upload completed successfully:', stats);
      
      return { success: true, stats, message: 'Data uploaded to cloud successfully!' };
    } catch (error) {
      this.status.errors.push({
        message: error.message,
        timestamp: new Date().toISOString(),
        type: 'upload'
      });
      console.error('❌ Manual upload failed:', error);
      throw error;
    } finally {
      this.status.manualSyncInProgress = false;
      this.saveStatusToLocalStorage();
    }
  }

  /**
   * MANUAL DOWNLOAD - User explicitly chooses to download from cloud
   */
  async manualDownloadFromCloud(options = {}) {
    const { 
      replaceLocal = false,
      mergeWithLocal = true 
    } = options;

    if (!this.status.isOnline) {
      throw new Error('Cannot download while offline. Please check your internet connection.');
    }

    if (!this.user?.id) {
      throw new Error('User not authenticated. Please sign in to download from cloud.');
    }

    this.status.manualSyncInProgress = true;
    this.status.errors = [];
    this.saveStatusToLocalStorage();

    try {
      console.log('📥 Starting manual download from cloud...');
      
      const stats = {
        expenses: { downloaded: 0, errors: 0 },
        categories: { downloaded: 0, errors: 0 },
        wallets: { downloaded: 0, errors: 0 },
        transfers: { downloaded: 0, errors: 0 },
        budgets: { downloaded: 0, errors: 0 },
        tags: { downloaded: 0, errors: 0 },
        recurring: { downloaded: 0, errors: 0 }
      };

      if (replaceLocal) {
        console.log('🗑️ Clearing local data for replacement...');
        await this.clearAllLocalData();
      }

      // Download each data type in dependency order
      await this.downloadDataType('categories', supabaseCategoryDB, localCategoryDB, stats, mergeWithLocal);
      await this.downloadDataType('tags', supabaseTagDB, localTagDB, stats, mergeWithLocal);
      await this.downloadDataType('wallets', supabaseWalletDB, localWalletDB, stats, mergeWithLocal);
      await this.downloadDataType('budgets', supabaseBudgetDB, localBudgetDB, stats, mergeWithLocal);
      await this.downloadDataType('recurring', supabaseRecurringDB, localRecurringDB, stats, mergeWithLocal);
      await this.downloadDataType('transfers', supabaseTransferDB, localTransferDB, stats, mergeWithLocal);
      await this.downloadDataType('expenses', supabaseExpenseDB, localExpenseDB, stats, mergeWithLocal);

      this.status.lastManualSync = new Date().toISOString();
      this.clearLocalChanges();
      await this.updateLocalDataCount();
      
      console.log('✅ Manual download completed successfully:', stats);
      
      return { success: true, stats, message: 'Data downloaded from cloud successfully!' };
    } catch (error) {
      this.status.errors.push({
        message: error.message,
        timestamp: new Date().toISOString(),
        type: 'download'
      });
      console.error('❌ Manual download failed:', error);
      throw error;
    } finally {
      this.status.manualSyncInProgress = false;
      this.saveStatusToLocalStorage();
    }
  }

  async uploadDataType(typeName, localDB, remoteDB, stats) {
    try {
      let localData;
      try {
        localData = typeName === 'expenses' ? await localDB.getAllIncludingDeleted() : await localDB.getAll();
      } catch (dbError) {
        console.error(`Error accessing local ${typeName} database:`, dbError);
        stats[typeName].errors++;
        return;
      }
      
      console.log(`📤 Uploading ${localData.length} ${typeName}...`);
      
      for (const item of localData) {
        try {
          const transformedItem = this.transformForSupabase(typeName, item);
          
          // Use upsert to avoid duplicates
          const { error } = await remoteDB.upsert ? 
            await remoteDB.upsert(transformedItem, this.user.id) :
            await remoteDB.add(transformedItem, this.user.id);
            
          if (error) {
            // Try update if add failed
            await remoteDB.update(transformedItem, this.user.id);
          }
          
          stats[typeName].uploaded++;
        } catch (error) {
          console.error(`Error uploading ${typeName}:`, error);
          stats[typeName].errors++;
        }
      }
    } catch (error) {
      console.error(`Error in uploadDataType for ${typeName}:`, error);
      stats[typeName].errors++;
    }
  }

  async downloadDataType(typeName, remoteDB, localDB, stats, mergeWithLocal = true) {
    try {
      let remoteData;
      try {
        remoteData = typeName === 'expenses' ? 
          await remoteDB.getAllIncludingDeleted(this.user.id) : 
          await remoteDB.getAll(this.user.id);
      } catch (remoteError) {
        console.error(`Error accessing remote ${typeName} database:`, remoteError);
        stats[typeName].errors++;
        return;
      }
      
      console.log(`📥 Downloading ${remoteData.length} ${typeName}...`);
      
      if (!mergeWithLocal) {
        try {
          const localData = await localDB.getAll();
          for (const item of localData) {
            await localDB.delete(item.id);
          }
        } catch (clearError) {
          console.error(`Error clearing local ${typeName} data:`, clearError);
        }
      }
      
      for (const item of remoteData) {
        try {
          const transformedItem = this.transformFromSupabase(typeName, item);
          
          if (mergeWithLocal) {
            const existingItem = await localDB.getById(item.id);
            if (existingItem) {
              await localDB.update(transformedItem);
            } else {
              await localDB.add(transformedItem);
            }
          } else {
            await localDB.add(transformedItem);
          }
          
          stats[typeName].downloaded++;
        } catch (error) {
          console.error(`Error downloading ${typeName}:`, error);
          stats[typeName].errors++;
        }
      }
    } catch (error) {
      console.error(`Error in downloadDataType for ${typeName}:`, error);
      stats[typeName].errors++;
    }
  }

  async clearAllLocalData() {
    const databases = [
      localExpenseDB,
      localCategoryDB,
      localWalletDB,
      localTransferDB,
      localBudgetDB,
      localTagDB,
      localRecurringDB
    ];

    for (const db of databases) {
      try {
        const allData = await db.getAll();
        for (const item of allData) {
          await db.delete(item.id);
        }
      } catch (error) {
        console.error('Error clearing local data:', error);
      }
    }
  }

  // Transform methods (same as original sync manager)
  transformForSupabase(typeName, item) {
    const transformed = { ...item };

    switch (typeName) {
      case 'expenses':
        if (transformed.walletId) {
          transformed.wallet_id = transformed.walletId;
          delete transformed.walletId;
        }
        if (transformed.isIncome !== undefined) {
          transformed.is_income = transformed.isIncome;
          delete transformed.isIncome;
        }
        if (transformed.photoUrl) {
          transformed.photo_url = transformed.photoUrl;
          delete transformed.photoUrl;
        }
        break;
      
      case 'transfers':
        if (transformed.fromWallet) {
          transformed.from_wallet_id = transformed.fromWallet;
          delete transformed.fromWallet;
        }
        if (transformed.toWallet) {
          transformed.to_wallet_id = transformed.toWallet;
          delete transformed.toWallet;
        }
        if (transformed.fromWalletName) {
          transformed.from_wallet_name = transformed.fromWalletName;
          delete transformed.fromWalletName;
        }
        if (transformed.toWalletName) {
          transformed.to_wallet_name = transformed.toWalletName;
          delete transformed.toWalletName;
        }
        if (transformed.photoUrl) {
          transformed.photo_url = transformed.photoUrl;
          delete transformed.photoUrl;
        }
        break;
    }

    return transformed;
  }

  transformFromSupabase(typeName, item) {
    const transformed = { ...item };
    
    delete transformed.user_id;
    delete transformed.created_at;
    delete transformed.updated_at;

    switch (typeName) {
      case 'expenses':
        if (transformed.wallet_id) {
          transformed.walletId = transformed.wallet_id;
          delete transformed.wallet_id;
        }
        if (transformed.is_income !== undefined) {
          transformed.isIncome = transformed.is_income;
          delete transformed.is_income;
        }
        if (transformed.photo_url) {
          transformed.photoUrl = transformed.photo_url;
          delete transformed.photo_url;
        }
        break;
      
      case 'transfers':
        if (transformed.from_wallet_id) {
          transformed.fromWallet = transformed.from_wallet_id;
          delete transformed.from_wallet_id;
        }
        if (transformed.to_wallet_id) {
          transformed.toWallet = transformed.to_wallet_id;
          delete transformed.to_wallet_id;
        }
        if (transformed.from_wallet_name) {
          transformed.fromWalletName = transformed.from_wallet_name;
          delete transformed.from_wallet_name;
        }
        if (transformed.to_wallet_name) {
          transformed.toWalletName = transformed.to_wallet_name;
          delete transformed.to_wallet_name;
        }
        if (transformed.photo_url) {
          transformed.photoUrl = transformed.photo_url;
          delete transformed.photo_url;
        }
        break;
    }

    return transformed;
  }

  /**
   * Export all local data as JSON
   */
  async exportLocalData() {
    try {
      const [
        expenses,
        categories,
        wallets,
        transfers,
        tags,
        budgets,
        recurring
      ] = await Promise.all([
        localExpenseDB.getAll(),
        localCategoryDB.getAll(),
        localWalletDB.getAll(),
        localTransferDB.getAll(),
        localTagDB.getAll(),
        localBudgetDB.getAll(),
        localRecurringDB.getAll()
      ]);

      const exportData = {
        version: '2.0',
        exportType: 'manual_export',
        exportDate: new Date().toISOString(),
        userId: this.user?.id || 'anonymous',
        data: {
          expenses,
          categories,
          wallets,
          transfers,
          tags,
          budgets,
          recurring
        },
        metadata: {
          totalExpenses: expenses.length,
          totalCategories: categories.length,
          totalWallets: wallets.length,
          totalTransfers: transfers.length,
          totalTags: tags.length,
          totalBudgets: budgets.length,
          totalRecurring: recurring.length,
          hasLocalChanges: this.status.hasLocalChanges,
          lastManualSync: this.status.lastManualSync
        }
      };

      return exportData;
    } catch (error) {
      console.error('Error exporting data:', error);
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  /**
   * Import data from JSON backup
   */
  async importLocalData(importData, options = { replaceExisting: false }) {
    try {
      if (!importData.version || !importData.data) {
        throw new Error('Invalid backup file format');
      }

      const { data } = importData;
      const { replaceExisting } = options;

      if (replaceExisting) {
        await this.clearAllLocalData();
      }

      const imports = [
        { name: 'categories', data: data.categories || [], db: localCategoryDB },
        { name: 'tags', data: data.tags || [], db: localTagDB },
        { name: 'wallets', data: data.wallets || [], db: localWalletDB },
        { name: 'budgets', data: data.budgets || [], db: localBudgetDB },
        { name: 'recurring', data: data.recurring || [], db: localRecurringDB },
        { name: 'transfers', data: data.transfers || [], db: localTransferDB },
        { name: 'expenses', data: data.expenses || [], db: localExpenseDB }
      ];

      const stats = {};
      
      for (const importItem of imports) {
        try {
          let imported = 0;
          for (const item of importItem.data) {
            try {
              if (replaceExisting) {
                await importItem.db.add(item);
              } else {
                try {
                  await importItem.db.add(item);
                } catch (addError) {
                  await importItem.db.update(item);
                }
              }
              imported++;
            } catch (itemError) {
              console.warn(`Error importing ${importItem.name} item:`, itemError);
            }
          }
          stats[importItem.name] = { imported, total: importItem.data.length };
        } catch (error) {
          console.error(`Error importing ${importItem.name}:`, error);
          stats[importItem.name] = { imported: 0, total: importItem.data.length, error: error.message };
        }
      }

      this.markLocalChange();
      await this.updateLocalDataCount();

      return { success: true, stats };
    } catch (error) {
      console.error('Error importing data:', error);
      throw new Error(`Import failed: ${error.message}`);
    }
  }

  /**
   * Get comprehensive status for UI
   */
  async getDetailedStatus() {
    await this.updateLocalDataCount();
    
    return {
      ...this.status,
      dataAge: this.getDataAge(),
      storageUsage: await this.getStorageUsage(),
      recommendations: this.getRecommendations()
    };
  }

  getDataAge() {
    const lastSync = this.status.lastManualSync;
    if (!lastSync) return null;
    
    const ageMs = Date.now() - new Date(lastSync).getTime();
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    
    return {
      lastSyncDate: lastSync,
      ageInDays: ageDays,
      ageInHours: Math.floor(ageMs / (1000 * 60 * 60))
    };
  }

  async getStorageUsage() {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage,
          available: estimate.quota,
          percentage: estimate.quota ? (estimate.usage / estimate.quota) * 100 : 0
        };
      }
    } catch (error) {
      console.warn('Could not get storage usage:', error);
    }
    return null;
  }

  getRecommendations() {
    const recommendations = [];
    const dataAge = this.getDataAge();
    
    if (this.status.hasLocalChanges) {
      recommendations.push({
        type: 'backup',
        priority: 'medium',
        message: 'You have unsaved changes. Consider backing up your data.',
        action: 'export_or_upload'
      });
    }
    
    if (dataAge && dataAge.ageInDays > 7) {
      recommendations.push({
        type: 'backup',
        priority: 'high',
        message: `Your data hasn't been backed up for ${dataAge.ageInDays} days.`,
        action: 'export_or_upload'
      });
    }
    
    if (this.status.localDataCount.total > 1000) {
      recommendations.push({
        type: 'performance',
        priority: 'low',
        message: 'You have a lot of local data. Consider periodic exports for backup.',
        action: 'export'
      });
    }
    
    return recommendations;
  }

  cleanup() {
    window.removeEventListener('online', this.handleOnlineStatusChange.bind(this));
    window.removeEventListener('offline', this.handleOnlineStatusChange.bind(this));
  }
}

// Global manual sync manager instance
let globalManualSyncManager = null;

export const initializeManualSyncManager = (user) => {
  if (user && user.id) {
    globalManualSyncManager = new ManualSyncManager(user);
  } else {
    globalManualSyncManager = null;
  }
};

export const getManualSyncManager = () => {
  return globalManualSyncManager;
};

export const markLocalChange = () => {
  if (globalManualSyncManager) {
    globalManualSyncManager.markLocalChange();
  } else {
    safeSetItem('hasLocalChanges', 'true');
  }
};

// Data persistence guarantees
export const DataPersistenceInfo = {
  // IndexedDB data persists until:
  // 1. User manually clears browser data
  // 2. Browser runs out of storage space (rare)
  // 3. User uninstalls browser (mobile)
  // 4. System storage cleanup (very rare)
  
  getEstimatedPersistence: async () => {
    try {
      if ('storage' in navigator && 'persist' in navigator.storage) {
        const isPersistent = await navigator.storage.persist();
        return {
          isPersistent,
          message: isPersistent 
            ? 'Data will persist until manually cleared'
            : 'Data may be cleared if storage is low (rare)'
        };
      }
    } catch (error) {
      console.warn('Could not check persistence:', error);
    }
    return {
      isPersistent: false,
      message: 'Persistence status unknown - data should persist normally'
    };
  },

  requestPersistentStorage: async () => {
    try {
      if ('storage' in navigator && 'persist' in navigator.storage) {
        const granted = await navigator.storage.persist();
        return granted;
      }
    } catch (error) {
      console.warn('Could not request persistent storage:', error);
    }
    return false;
  }
}; 