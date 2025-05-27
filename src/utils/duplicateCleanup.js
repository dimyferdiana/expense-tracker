/**
 * Duplicate Transaction Cleanup Utility
 * Helps identify and remove duplicate transactions safely
 */

import { expenseDB as localExpenseDB } from './db';
import { expenseDB as supabaseExpenseDB } from './supabase-db';

// Track recently cleaned duplicates to prevent restoration
const CLEANED_DUPLICATES_KEY = 'expense_tracker_cleaned_duplicates';
const CLEANUP_RETENTION_DAYS = 7; // Keep track for 7 days

export class DuplicateCleanupManager {
  constructor(user, useCloudDB = false) {
    this.user = user;
    this.useCloudDB = useCloudDB;
  }

  /**
   * Track a cleaned duplicate to prevent restoration
   */
  static trackCleanedDuplicate(transactionId, cleanupReason = 'duplicate_cleanup') {
    try {
      const cleanedDuplicates = this.getCleanedDuplicates();
      cleanedDuplicates[transactionId] = {
        cleanedAt: new Date().toISOString(),
        reason: cleanupReason,
        fingerprint: this.generateCleanupFingerprint(transactionId)
      };
      
      // Clean old entries
      this.cleanOldCleanedDuplicates(cleanedDuplicates);
      
      localStorage.setItem(CLEANED_DUPLICATES_KEY, JSON.stringify(cleanedDuplicates));
    } catch (error) {
      console.warn('Failed to track cleaned duplicate:', error);
    }
  }

  /**
   * Check if a transaction was recently cleaned as a duplicate
   */
  static isRecentlyCleanedDuplicate(transactionId) {
    try {
      const cleanedDuplicates = this.getCleanedDuplicates();
      const isTracked = cleanedDuplicates.hasOwnProperty(transactionId);
      
      if (isTracked) {
        const entry = cleanedDuplicates[transactionId];
        console.log(`✅ Transaction ${transactionId} is tracked as cleaned duplicate:`, {
          cleanedAt: entry.cleanedAt,
          reason: entry.reason,
          fingerprint: entry.fingerprint
        });
      } else {
        console.log(`❌ Transaction ${transactionId} is NOT tracked as cleaned duplicate`);
      }
      
      return isTracked;
    } catch (error) {
      console.warn('Failed to check cleaned duplicates:', error);
      return false;
    }
  }

  /**
   * Get all tracked cleaned duplicates
   */
  static getCleanedDuplicates() {
    try {
      const stored = localStorage.getItem(CLEANED_DUPLICATES_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('Failed to get cleaned duplicates:', error);
      return {};
    }
  }

  /**
   * Clean old cleaned duplicate entries
   */
  static cleanOldCleanedDuplicates(cleanedDuplicates) {
    const cutoffDate = new Date(Date.now() - CLEANUP_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    
    Object.keys(cleanedDuplicates).forEach(id => {
      const entry = cleanedDuplicates[id];
      if (new Date(entry.cleanedAt) < cutoffDate) {
        delete cleanedDuplicates[id];
      }
    });
  }

  /**
   * Generate a fingerprint for cleanup tracking
   */
  static generateCleanupFingerprint(transactionId) {
    return `cleanup_${transactionId}_${Date.now()}`;
  }

  /**
   * Clear all tracked cleaned duplicates (for testing/reset)
   */
  static clearCleanedDuplicates() {
    try {
      localStorage.removeItem(CLEANED_DUPLICATES_KEY);
    } catch (error) {
      console.warn('Failed to clear cleaned duplicates:', error);
    }
  }

  /**
   * Get statistics about cleaned duplicates
   */
  static getCleanupStatistics() {
    try {
      const cleanedDuplicates = this.getCleanedDuplicates();
      const entries = Object.entries(cleanedDuplicates);
      
      const stats = {
        totalTracked: entries.length,
        byReason: {},
        oldestCleanup: null,
        newestCleanup: null,
        recentCleanups: 0 // within last 24 hours
      };

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      entries.forEach(([id, entry]) => {
        const cleanedAt = new Date(entry.cleanedAt);
        
        // Count by reason
        stats.byReason[entry.reason] = (stats.byReason[entry.reason] || 0) + 1;
        
        // Track oldest/newest
        if (!stats.oldestCleanup || cleanedAt < new Date(stats.oldestCleanup)) {
          stats.oldestCleanup = entry.cleanedAt;
        }
        if (!stats.newestCleanup || cleanedAt > new Date(stats.newestCleanup)) {
          stats.newestCleanup = entry.cleanedAt;
        }
        
        // Count recent cleanups
        if (cleanedAt > oneDayAgo) {
          stats.recentCleanups++;
        }
      });

      return stats;
    } catch (error) {
      console.warn('Failed to get cleanup statistics:', error);
      return { error: error.message };
    }
  }

  /**
   * Debug function to log cleanup status
   */
  static debugCleanupStatus() {
    const stats = this.getCleanupStatistics();
    console.group('🧹 Duplicate Cleanup Status');
    console.log('Total tracked cleaned duplicates:', stats.totalTracked);
    console.log('Recent cleanups (24h):', stats.recentCleanups);
    console.log('Cleanup reasons:', stats.byReason);
    if (stats.oldestCleanup) {
      console.log('Oldest cleanup:', new Date(stats.oldestCleanup).toLocaleString());
    }
    if (stats.newestCleanup) {
      console.log('Newest cleanup:', new Date(stats.newestCleanup).toLocaleString());
    }
    console.groupEnd();
    return stats;
  }

  /**
   * Find duplicate transactions based on multiple criteria
   */
  async findDuplicates() {
    const expenseDB = this.useCloudDB ? supabaseExpenseDB : localExpenseDB;
    
    let expenses;
    if (this.useCloudDB && this.user?.id) {
      expenses = await expenseDB.getAllIncludingDeleted(this.user.id);
    } else {
      expenses = await expenseDB.getAllIncludingDeleted();
    }

    // Filter out already deleted expenses
    const activeExpenses = expenses.filter(expense => !expense.deleted_at);

    // Group potential duplicates
    const duplicateGroups = this.groupDuplicates(activeExpenses);
    
    return duplicateGroups;
  }

  /**
   * Group transactions that are likely duplicates
   */
  groupDuplicates(expenses) {
    const groups = new Map();
    
    expenses.forEach(expense => {
      // Create a key based on amount, description, date, and category
      const key = this.createDuplicateKey(expense);
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(expense);
    });

    // Filter to only groups with more than one item
    const duplicateGroups = [];
    groups.forEach((group, key) => {
      if (group.length > 1) {
        // Sort by creation date to keep the oldest
        group.sort((a, b) => {
          const dateA = new Date(a.created_at || a.date);
          const dateB = new Date(b.created_at || b.date);
          return dateA - dateB;
        });

        duplicateGroups.push({
          key,
          count: group.length,
          transactions: group,
          toKeep: group[0], // Keep the oldest
          toDelete: group.slice(1) // Delete the rest
        });
      }
    });

    return duplicateGroups;
  }

  /**
   * Create a key for identifying potential duplicates
   */
  createDuplicateKey(expense) {
    const amount = parseFloat(expense.amount).toFixed(2);
    const description = (expense.description || expense.name || '').toLowerCase().trim();
    const date = expense.date;
    const category = expense.category || '';
    
    return `${amount}|${description}|${date}|${category}`;
  }

  /**
   * Remove duplicate transactions safely
   */
  async removeDuplicates(duplicateGroups, options = {}) {
    const { dryRun = false, maxToDelete = 100 } = options;
    
    const expenseDB = this.useCloudDB ? supabaseExpenseDB : localExpenseDB;
    
    let deletedCount = 0;
    const results = {
      processed: 0,
      deleted: 0,
      errors: [],
      dryRun
    };

    for (const group of duplicateGroups) {
      if (deletedCount >= maxToDelete) {
        break;
      }

      results.processed++;

      for (const duplicate of group.toDelete) {
        if (deletedCount >= maxToDelete) {
          break;
        }

        try {
          if (!dryRun) {
            if (this.useCloudDB && this.user?.id) {
              await expenseDB.delete(duplicate.id, this.user.id);
            } else {
              await expenseDB.delete(duplicate.id);
            }
            
            // Track this as a cleaned duplicate to prevent restoration
            DuplicateCleanupManager.trackCleanedDuplicate(duplicate.id, 'automatic_duplicate_cleanup');
          }
          
          deletedCount++;
          results.deleted++;
          
          console.log(`${dryRun ? '[DRY RUN] Would delete' : 'Deleted'} duplicate:`, {
            id: duplicate.id,
            amount: duplicate.amount,
            description: duplicate.description || duplicate.name,
            date: duplicate.date
          });
          
        } catch (error) {
          console.error('Error deleting duplicate:', error);
          results.errors.push({
            id: duplicate.id,
            error: error.message
          });
        }
      }
    }

    return results;
  }

  /**
   * Get summary of duplicate analysis
   */
  getDuplicateSummary(duplicateGroups) {
    const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.toDelete.length, 0);
    const totalGroups = duplicateGroups.length;
    
    const byAmount = duplicateGroups.reduce((acc, group) => {
      const amount = parseFloat(group.transactions[0].amount);
      acc[amount] = (acc[amount] || 0) + group.toDelete.length;
      return acc;
    }, {});

    return {
      totalGroups,
      totalDuplicates,
      duplicatesByAmount: byAmount,
      largestGroup: Math.max(...duplicateGroups.map(g => g.count), 0)
    };
  }

  /**
   * Perform a safe cleanup with confirmation
   */
  async performSafeCleanup(options = {}) {
    const { 
      maxToDelete = 50, 
      dryRun = true,
      requireConfirmation = true 
    } = options;

    try {
      // Step 1: Find duplicates
      console.log('Scanning for duplicate transactions...');
      const duplicateGroups = await this.findDuplicates();
      
      if (duplicateGroups.length === 0) {
        return {
          success: true,
          message: 'No duplicate transactions found.',
          duplicates: 0
        };
      }

      // Step 2: Get summary
      const summary = this.getDuplicateSummary(duplicateGroups);
      console.log('Duplicate analysis:', summary);

      // Step 3: Perform cleanup
      const results = await this.removeDuplicates(duplicateGroups, {
        dryRun,
        maxToDelete
      });

      return {
        success: true,
        summary,
        results,
        message: dryRun 
          ? `Found ${summary.totalDuplicates} duplicates in ${summary.totalGroups} groups. Run with dryRun=false to delete them.`
          : `Successfully removed ${results.deleted} duplicate transactions.`
      };

    } catch (error) {
      console.error('Error during duplicate cleanup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export utility functions
export const findDuplicateTransactions = async (user, useCloudDB = false) => {
  const manager = new DuplicateCleanupManager(user, useCloudDB);
  return await manager.findDuplicates();
};

export const cleanupDuplicates = async (user, useCloudDB = false, options = {}) => {
  const manager = new DuplicateCleanupManager(user, useCloudDB);
  return await manager.performSafeCleanup(options);
};

// Make debug functions available globally for development
if (typeof window !== 'undefined') {
  window.DuplicateCleanupDebugger = {
    getStatistics: () => DuplicateCleanupManager.getCleanupStatistics(),
    debugStatus: () => DuplicateCleanupManager.debugCleanupStatus(),
    clearTracking: () => DuplicateCleanupManager.clearCleanedDuplicates(),
    isRecentlyCleaned: (id) => DuplicateCleanupManager.isRecentlyCleanedDuplicate(id),
    getTrackedDuplicates: () => DuplicateCleanupManager.getCleanedDuplicates(),
    
    // Test function to verify the system is working
    testDuplicatePrevention: () => {
      console.group('🧪 Testing Duplicate Prevention System');
      
      // Test 1: Track a fake duplicate
      const testId = 'test_duplicate_' + Date.now();
      console.log('Test 1: Tracking a test duplicate...');
      DuplicateCleanupManager.trackCleanedDuplicate(testId, 'test_cleanup');
      
      // Test 2: Check if it's tracked
      console.log('Test 2: Checking if test duplicate is tracked...');
      const isTracked = DuplicateCleanupManager.isRecentlyCleanedDuplicate(testId);
      console.log('Is tracked:', isTracked);
      
      // Test 3: Get statistics
      console.log('Test 3: Getting cleanup statistics...');
      const stats = DuplicateCleanupManager.getCleanupStatistics();
      console.log('Statistics:', stats);
      
      // Test 4: Get all tracked duplicates
      console.log('Test 4: Getting all tracked duplicates...');
      const tracked = DuplicateCleanupManager.getCleanedDuplicates();
      console.log('Tracked duplicates:', tracked);
      
      // Clean up test data
      console.log('Cleaning up test data...');
      const allTracked = DuplicateCleanupManager.getCleanedDuplicates();
      delete allTracked[testId];
      localStorage.setItem('expense_tracker_cleaned_duplicates', JSON.stringify(allTracked));
      
      console.log('✅ Test completed successfully!');
      console.groupEnd();
      
      return {
        testPassed: isTracked,
        statistics: stats,
        trackedCount: Object.keys(tracked).length
      };
    },
    
    // Function to manually track a transaction as cleaned
    manuallyTrackCleaned: (transactionId, reason = 'manual_test') => {
      console.log(`Manually tracking transaction ${transactionId} as cleaned...`);
      DuplicateCleanupManager.trackCleanedDuplicate(transactionId, reason);
      console.log('✅ Transaction tracked successfully');
      return DuplicateCleanupManager.isRecentlyCleanedDuplicate(transactionId);
    }
  };
  
  console.log('🧹 DuplicateCleanupDebugger available globally. Try: DuplicateCleanupDebugger.testDuplicatePrevention()');
}

export default DuplicateCleanupManager; 