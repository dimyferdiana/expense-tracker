import React from 'react';
import { 
  expenseDB as localExpenseDB,
  categoryDB as localCategoryDB,
  walletDB as localWalletDB,
  transferDB as localTransferDB,
  budgetDB as localBudgetDB,
  tagDB as localTagDB,
  recurringDB as localRecurringDB
} from './db';

import {
  expenseDB as supabaseExpenseDB,
  categoryDB as supabaseCategoryDB,
  walletDB as supabaseWalletDB,
  transferDB as supabaseTransferDB,
  budgetDB as supabaseBudgetDB,
  tagDB as supabaseTagDB,
  recurringDB as supabaseRecurringDB
} from './supabase-db';

/**
 * Comprehensive sync manager for local-first expense tracker
 */
export class SyncManager {
  constructor(user) {
    this.user = user;
    this.syncStatus = {
      lastSync: this.getLastSyncTime(),
      inProgress: false,
      conflicts: [],
      errors: [],
      hasLocalChanges: this.hasLocalChanges(),
      isOnline: navigator.onLine
    };

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnlineStatusChange.bind(this));
    window.addEventListener('offline', this.handleOnlineStatusChange.bind(this));
    
    // Initialize local database if needed
    this.initializeLocalDatabase();
  }

  /**
   * Initialize local database to ensure it's ready for sync operations
   */
  async initializeLocalDatabase() {
    try {
      const { initializeDatabase } = await import('./db');
      const initialized = await initializeDatabase();
      if (!initialized) {
        console.warn('Local database initialization failed, sync may not work properly');
      } else {
        console.log('Local database initialized successfully for sync');
      }
    } catch (error) {
      console.error('Error initializing local database for sync:', error);
    }
  }

  getSyncStatus() {
    return this.syncStatus;
  }

  handleOnlineStatusChange() {
    this.syncStatus.isOnline = navigator.onLine;
    this.saveStatusToLocalStorage();
  }

  getLastSyncTime() {
    return localStorage.getItem('lastSyncTime') || null;
  }

  hasLocalChanges() {
    return localStorage.getItem('hasLocalChanges') === 'true';
  }

  markLocalChange() {
    this.syncStatus.hasLocalChanges = true;
    localStorage.setItem('hasLocalChanges', 'true');
    this.saveStatusToLocalStorage();
  }

  clearLocalChanges() {
    this.syncStatus.hasLocalChanges = false;
    localStorage.removeItem('hasLocalChanges');
    this.saveStatusToLocalStorage();
  }

  saveStatusToLocalStorage() {
    localStorage.setItem('syncStatus', JSON.stringify(this.syncStatus));
    if (this.syncStatus.lastSync) {
      localStorage.setItem('lastSyncTime', this.syncStatus.lastSync);
    }
  }

  /**
   * Main sync function - handles bidirectional, upload, or download
   */
  async fullSync(direction = 'bidirectional') {
    if (this.syncStatus.inProgress) {
      throw new Error('Sync already in progress');
    }

    if (!this.syncStatus.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    if (!this.user?.id) {
      throw new Error('User not authenticated');
    }

    // Validate local database availability before starting sync
    try {
      await this.validateLocalDatabase();
    } catch (error) {
      console.error('Local database validation failed:', error);
      throw new Error(`Local database not ready: ${error.message}`);
    }

    this.syncStatus.inProgress = true;
    this.syncStatus.errors = [];
    this.syncStatus.conflicts = [];
    this.saveStatusToLocalStorage();

    try {
      let result = { success: true, conflicts: [], stats: {} };

      switch (direction) {
        case 'upload':
          result = await this.uploadToCloud();
          break;
        case 'download':
          result = await this.downloadFromCloud();
          break;
        case 'bidirectional':
        default:
          result = await this.bidirectionalSync();
          break;
      }

      this.syncStatus.lastSync = new Date().toISOString();
      this.clearLocalChanges();
      console.log(`${direction} sync completed successfully:`, result.stats);
      
      return result;
    } catch (error) {
      this.syncStatus.errors.push({
        message: error.message,
        timestamp: new Date().toISOString(),
        type: direction
      });
      throw error;
    } finally {
      this.syncStatus.inProgress = false;
      this.saveStatusToLocalStorage();
    }
  }

  /**
   * Validate that local database is properly initialized and accessible
   */
  async validateLocalDatabase() {
    try {
      // Test each database to ensure they're accessible
      const testPromises = [
        localExpenseDB.getAll().catch(err => ({ error: 'expenses', message: err.message })),
        localCategoryDB.getAll().catch(err => ({ error: 'categories', message: err.message })),
        localWalletDB.getAll().catch(err => ({ error: 'wallets', message: err.message })),
        localTagDB.getAll().catch(err => ({ error: 'tags', message: err.message })),
        localBudgetDB.getAll().catch(err => ({ error: 'budgets', message: err.message })),
        localRecurringDB.getAll().catch(err => ({ error: 'recurring', message: err.message })),
        localTransferDB.getAll().catch(err => ({ error: 'transfers', message: err.message }))
      ];

      const results = await Promise.all(testPromises);
      const errors = results.filter(result => result && result.error);
      
      if (errors.length > 0) {
        const errorMessages = errors.map(err => `${err.error}: ${err.message}`).join(', ');
        throw new Error(`Database validation failed for: ${errorMessages}`);
      }
      
      console.log('Local database validation successful');
      return true;
    } catch (error) {
      console.error('Database validation error:', error);
      throw error;
    }
  }

  /**
   * Upload all local data to Supabase
   */
  async uploadToCloud() {
    const stats = {
      expenses: { uploaded: 0, errors: 0 },
      categories: { uploaded: 0, errors: 0 },
      wallets: { uploaded: 0, errors: 0 },
      transfers: { uploaded: 0, errors: 0 },
      tags: { uploaded: 0, errors: 0 },
      budgets: { uploaded: 0, errors: 0 },
      recurring: { uploaded: 0, errors: 0 }
    };

    // Upload in dependency order: categories, tags, wallets first, then transactions
    await this.uploadDataType('categories', localCategoryDB, supabaseCategoryDB, stats);
    await this.uploadDataType('tags', localTagDB, supabaseTagDB, stats);
    await this.uploadDataType('wallets', localWalletDB, supabaseWalletDB, stats);
    await this.uploadDataType('budgets', localBudgetDB, supabaseBudgetDB, stats);
    await this.uploadDataType('recurring', localRecurringDB, supabaseRecurringDB, stats);
    await this.uploadDataType('transfers', localTransferDB, supabaseTransferDB, stats);
    await this.uploadDataType('expenses', localExpenseDB, supabaseExpenseDB, stats);

    return { success: true, conflicts: [], stats };
  }

  /**
   * Download all data from Supabase to local storage
   */
  async downloadFromCloud() {
    const stats = {
      expenses: { downloaded: 0, errors: 0 },
      categories: { downloaded: 0, errors: 0 },
      wallets: { downloaded: 0, errors: 0 },
      transfers: { downloaded: 0, errors: 0 },
      tags: { downloaded: 0, errors: 0 },
      budgets: { downloaded: 0, errors: 0 },
      recurring: { downloaded: 0, errors: 0 }
    };

    // Download in dependency order
    await this.downloadDataType('categories', supabaseCategoryDB, localCategoryDB, stats);
    await this.downloadDataType('tags', supabaseTagDB, localTagDB, stats);
    await this.downloadDataType('wallets', supabaseWalletDB, localWalletDB, stats);
    await this.downloadDataType('budgets', supabaseBudgetDB, localBudgetDB, stats);
    await this.downloadDataType('recurring', supabaseRecurringDB, localRecurringDB, stats);
    await this.downloadDataType('transfers', supabaseTransferDB, localTransferDB, stats);
    await this.downloadDataType('expenses', supabaseExpenseDB, localExpenseDB, stats);

    return { success: true, conflicts: [], stats };
  }

  /**
   * Bidirectional sync with conflict resolution
   */
  async bidirectionalSync() {
    const stats = {
      expenses: { uploaded: 0, downloaded: 0, conflicts: 0 },
      categories: { uploaded: 0, downloaded: 0, conflicts: 0 },
      wallets: { uploaded: 0, downloaded: 0, conflicts: 0 },
      transfers: { uploaded: 0, downloaded: 0, conflicts: 0 },
      tags: { uploaded: 0, downloaded: 0, conflicts: 0 },
      budgets: { uploaded: 0, downloaded: 0, conflicts: 0 },
      recurring: { uploaded: 0, downloaded: 0, conflicts: 0 }
    };

    const conflicts = [];

    // Sync each data type with conflict resolution
    const dataTypes = [
      { name: 'categories', local: localCategoryDB, remote: supabaseCategoryDB },
      { name: 'tags', local: localTagDB, remote: supabaseTagDB },
      { name: 'wallets', local: localWalletDB, remote: supabaseWalletDB },
      { name: 'budgets', local: localBudgetDB, remote: supabaseBudgetDB },
      { name: 'recurring', local: localRecurringDB, remote: supabaseRecurringDB },
      { name: 'transfers', local: localTransferDB, remote: supabaseTransferDB },
      { name: 'expenses', local: localExpenseDB, remote: supabaseExpenseDB }
    ];

    for (const dataType of dataTypes) {
      try {
        const result = await this.syncDataTypeBidirectional(
          dataType.name,
          dataType.local,
          dataType.remote,
          stats[dataType.name]
        );
        if (result.conflicts.length > 0) {
          conflicts.push(...result.conflicts);
          stats[dataType.name].conflicts = result.conflicts.length;
        }
      } catch (error) {
        console.error(`Error syncing ${dataType.name}:`, error);
        this.syncStatus.errors.push({
          message: `${dataType.name}: ${error.message}`,
          timestamp: new Date().toISOString(),
          type: 'bidirectional'
        });
      }
    }

    return { success: true, conflicts, stats };
  }

  /**
   * Upload a specific data type
   */
  async uploadDataType(typeName, localDB, remoteDB, stats) {
    try {
      // First test if local database is accessible
      let localData;
      try {
        localData = await localDB.getAll();
      } catch (dbError) {
        console.error(`Error accessing local ${typeName} database:`, dbError);
        stats[typeName].errors++;
        return; // Skip this data type if database is not accessible
      }
      
      for (const item of localData) {
        try {
          const transformedItem = this.transformForSupabase(typeName, item);
          await remoteDB.add(transformedItem, this.user.id);
          stats[typeName].uploaded++;
        } catch (error) {
          // Handle duplicate key errors gracefully
          if (error.message.includes('duplicate') || error.code === '23505') {
            try {
              const transformedItem = this.transformForSupabase(typeName, item);
              await remoteDB.update(transformedItem, this.user.id);
              stats[typeName].uploaded++;
            } catch (updateError) {
              console.error(`Error updating ${typeName}:`, updateError);
              stats[typeName].errors++;
            }
          } else {
            console.error(`Error uploading ${typeName}:`, error);
            stats[typeName].errors++;
          }
        }
      }
    } catch (error) {
      console.error(`Error in uploadDataType for ${typeName}:`, error);
      stats[typeName].errors++;
    }
  }

  /**
   * Download a specific data type
   */
  async downloadDataType(typeName, remoteDB, localDB, stats) {
    try {
      // Get remote data first
      let remoteData;
      try {
        remoteData = await remoteDB.getAll(this.user.id);
      } catch (remoteError) {
        console.error(`Error accessing remote ${typeName} database:`, remoteError);
        stats[typeName].errors++;
        return; // Skip this data type if remote database is not accessible
      }
      
      // Test local database access before clearing
      try {
        await localDB.getAll();
      } catch (localError) {
        console.error(`Error accessing local ${typeName} database:`, localError);
        stats[typeName].errors++;
        return; // Skip this data type if local database is not accessible
      }
      
      // Clear local data first
      try {
        const localData = await localDB.getAll();
        for (const item of localData) {
          await localDB.delete(item.id);
        }
      } catch (clearError) {
        console.error(`Error clearing local ${typeName} data:`, clearError);
        // Continue with download even if clearing fails
      }
      
      // Add remote data to local
      for (const item of remoteData) {
        try {
          const transformedItem = this.transformFromSupabase(typeName, item);
          await localDB.add(transformedItem);
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

  /**
   * Bidirectional sync for a specific data type with conflict resolution
   */
  async syncDataTypeBidirectional(typeName, localDB, remoteDB, stats) {
    const conflicts = [];
    
    try {
      const [localData, remoteData] = await Promise.all([
        localDB.getAll(),
        remoteDB.getAll(this.user.id)
      ]);

      // Create maps for easier comparison
      const localMap = new Map(localData.map(item => [item.id, item]));
      const remoteMap = new Map(remoteData.map(item => [item.id, item]));

      // Find items that exist only locally (need to upload)
      for (const [id, localItem] of localMap) {
        if (!remoteMap.has(id)) {
          try {
            const transformedItem = this.transformForSupabase(typeName, localItem);
            await remoteDB.add(transformedItem, this.user.id);
            stats.uploaded++;
          } catch (error) {
            console.error(`Error uploading new ${typeName}:`, error);
          }
        }
      }

      // Find items that exist only remotely (need to download)
      for (const [id, remoteItem] of remoteMap) {
        if (!localMap.has(id)) {
          try {
            const transformedItem = this.transformFromSupabase(typeName, remoteItem);
            await localDB.add(transformedItem);
            stats.downloaded++;
          } catch (error) {
            console.error(`Error downloading new ${typeName}:`, error);
          }
        }
      }

      // Handle conflicts (items that exist in both but may be different)
      for (const [id, localItem] of localMap) {
        const remoteItem = remoteMap.get(id);
        if (remoteItem) {
          const hasConflict = this.detectConflict(typeName, localItem, remoteItem);
          if (hasConflict) {
            // For now, prefer remote version (server wins)
            try {
              const transformedItem = this.transformFromSupabase(typeName, remoteItem);
              await localDB.update(transformedItem);
              stats.downloaded++;
              
              conflicts.push({
                id,
                type: typeName,
                localVersion: localItem,
                remoteVersion: remoteItem,
                resolution: 'remote_wins'
              });
            } catch (error) {
              console.error(`Error resolving conflict for ${typeName}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error in bidirectional sync for ${typeName}:`, error);
      throw error;
    }

    return { conflicts };
  }

  /**
   * Transform data for Supabase (handles field mapping)
   */
  transformForSupabase(typeName, item) {
    const transformed = { ...item };

    switch (typeName) {
      case 'expenses':
        // Map local field names to Supabase column names
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

  /**
   * Transform data from Supabase (handles field mapping)
   */
  transformFromSupabase(typeName, item) {
    const transformed = { ...item };
    
    // Remove user_id and database-specific fields
    delete transformed.user_id;
    delete transformed.created_at;
    delete transformed.updated_at;

    switch (typeName) {
      case 'expenses':
        // Map Supabase column names to local field names
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
   * Detect conflicts between local and remote versions
   */
  detectConflict(typeName, localItem, remoteItem) {
    // Simple conflict detection based on content comparison
    // Exclude timestamps and user_id from comparison
    const localCopy = { ...localItem };
    const remoteCopy = { ...remoteItem };
    
    // Remove metadata fields
    delete localCopy.created_at;
    delete localCopy.updated_at;
    delete remoteCopy.created_at;
    delete remoteCopy.updated_at;
    delete remoteCopy.user_id;

    // Transform remote item for fair comparison
    const transformedRemote = this.transformFromSupabase(typeName, remoteCopy);
    
    return JSON.stringify(localCopy) !== JSON.stringify(transformedRemote);
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
        version: '1.0',
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
          totalRecurring: recurring.length
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
  async importLocalData(importData) {
    try {
      if (!importData.version || !importData.data) {
        throw new Error('Invalid backup file format');
      }

      const { data } = importData;

      // Clear existing data first
      const clearPromises = [
        this.clearDataType(localExpenseDB),
        this.clearDataType(localCategoryDB),
        this.clearDataType(localWalletDB),
        this.clearDataType(localTransferDB),
        this.clearDataType(localTagDB),
        this.clearDataType(localBudgetDB),
        this.clearDataType(localRecurringDB)
      ];
      
      await Promise.all(clearPromises);

      // Import data in dependency order
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
            await importItem.db.add(item);
            imported++;
          }
          stats[importItem.name] = { imported, total: importItem.data.length };
        } catch (error) {
          console.error(`Error importing ${importItem.name}:`, error);
          stats[importItem.name] = { imported: 0, total: importItem.data.length, error: error.message };
        }
      }

      // Mark as having local changes since we imported new data
      this.markLocalChange();

      return { success: true, stats };
    } catch (error) {
      console.error('Error importing data:', error);
      throw new Error(`Import failed: ${error.message}`);
    }
  }

  /**
   * Helper to clear all data from a database
   */
  async clearDataType(db) {
    try {
      const allData = await db.getAll();
      for (const item of allData) {
        await db.delete(item.id);
      }
    } catch (error) {
      console.error('Error clearing data type:', error);
    }
  }
}

export const createSyncManager = (user) => {
  return new SyncManager(user);
};

export const SyncUtils = {
  formatSyncStatus: (status) => {
    if (status.inProgress) return 'Syncing...';
    if (!status.isOnline) return 'Offline';
    if (status.hasLocalChanges) return 'Pending sync';
    if (status.errors.length > 0) return 'Error';
    return 'Ready';
  },

  getSyncIcon: (status) => {
    if (status.inProgress) return '🔄';
    if (!status.isOnline) return '📴';
    if (status.hasLocalChanges) return '⏳';
    if (status.errors.length > 0) return '⚠️';
    return '✅';
  },

  formatLastSync: (lastSync) => {
    if (!lastSync) return 'Never';
    
    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }
};

// Global sync manager instance for marking local changes
let globalSyncManager = null;

/**
 * Initialize global sync manager - call this when user logs in
 */
export const initializeGlobalSyncManager = (user) => {
  if (user && user.id) {
    globalSyncManager = new SyncManager(user);
  } else {
    globalSyncManager = null;
  }
};

/**
 * Utility function to mark local changes from anywhere in the app
 * Call this after any local database operation (add, update, delete)
 */
export const markLocalChange = () => {
  if (globalSyncManager) {
    globalSyncManager.markLocalChange();
  } else {
    // Fallback for when sync manager isn't initialized
    localStorage.setItem('hasLocalChanges', 'true');
  }
};

/**
 * Get the global sync manager instance
 */
export const getGlobalSyncManager = () => {
  return globalSyncManager;
};

/**
 * React hook for easy sync manager integration
 * Returns sync utilities and change tracking functions
 */
export const useSyncManager = () => {
  const [syncStatus, setSyncStatus] = React.useState(null);
  
  React.useEffect(() => {
    if (globalSyncManager) {
      const updateStatus = () => {
        setSyncStatus(globalSyncManager.getSyncStatus());
      };
      
      updateStatus();
      const interval = setInterval(updateStatus, 10000); // Update every 10s
      
      return () => clearInterval(interval);
    }
  }, [globalSyncManager]);
  
  return {
    syncManager: globalSyncManager,
    syncStatus,
    markLocalChange: markLocalChange,
    isInitialized: !!globalSyncManager
  };
}; 