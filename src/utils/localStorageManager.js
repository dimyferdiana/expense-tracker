// LocalStorage Manager - Handles quota management and cleanup
export class LocalStorageManager {
  static QUOTA_LIMIT = 5 * 1024 * 1024; // 5MB typical limit
  static WARNING_THRESHOLD = 0.8; // 80% of quota
  static isInitialized = false;

  // Get current localStorage usage
  static getCurrentUsage() {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }

  // Get usage percentage
  static getUsagePercentage() {
    return (this.getCurrentUsage() / this.QUOTA_LIMIT) * 100;
  }

  // Check if we're approaching quota limit
  static isApproachingQuota() {
    return this.getUsagePercentage() > (this.WARNING_THRESHOLD * 100);
  }

  // Get size of specific localStorage key
  static getKeySize(key) {
    const value = localStorage.getItem(key);
    return value ? value.length + key.length : 0;
  }

  // Get all localStorage keys with their sizes
  static getAllKeySizes() {
    const sizes = {};
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        sizes[key] = this.getKeySize(key);
      }
    }
    return sizes;
  }

  // Safe setItem with quota check
  static safeSetItem(key, value) {
    try {
      // Check if this operation would exceed quota
      const currentUsage = this.getCurrentUsage();
      const newDataSize = value.length + key.length;
      const existingKeySize = this.getKeySize(key);
      const projectedUsage = currentUsage - existingKeySize + newDataSize;

      if (projectedUsage > this.QUOTA_LIMIT) {
        console.warn('LocalStorage quota would be exceeded. Attempting cleanup...');
        this.performCleanup();
        
        // Try again after cleanup
        const newCurrentUsage = this.getCurrentUsage();
        const newProjectedUsage = newCurrentUsage - this.getKeySize(key) + newDataSize;
        
        if (newProjectedUsage > this.QUOTA_LIMIT) {
          throw new Error('QUOTA_BYTES quota exceeded even after cleanup');
        }
      }

      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('Error setting localStorage item:', error);
      if (error.message.includes('QUOTA') || error.name === 'QuotaExceededError') {
        this.handleQuotaExceeded(key, value);
      }
      throw error;
    }
  }

  // Handle quota exceeded error
  static handleQuotaExceeded(key, value) {
    console.warn('LocalStorage quota exceeded. Performing emergency cleanup...');
    
    // Emergency cleanup - remove largest non-essential items
    const sizes = this.getAllKeySizes();
    const sortedKeys = Object.keys(sizes).sort((a, b) => sizes[b] - sizes[a]);
    
    // Remove old/large items (but keep essential ones)
    const essentialKeys = ['user', 'auth', 'settings', 'onboarding_completed'];
    
    for (const keyToRemove of sortedKeys) {
      if (!essentialKeys.includes(keyToRemove)) {
        console.log(`Removing ${keyToRemove} (${sizes[keyToRemove]} bytes) to free space`);
        localStorage.removeItem(keyToRemove);
        
        // Check if we have enough space now
        try {
          localStorage.setItem(key, value);
          console.log('Successfully saved after cleanup');
          return;
        } catch (e) {
          // Continue cleanup
          continue;
        }
      }
    }
    
    throw new Error('Unable to free enough space in localStorage');
  }

  // Perform general cleanup
  static performCleanup() {
    try {
      console.log('Performing localStorage cleanup...');
      
      // Clean up large arrays (keep only recent items)
      this.compressLargeArrays();
      
      // Clean up sync data
      this.cleanupSyncData();
      
      console.log('✅ localStorage cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  // Clean up operation queue (keep only recent items)
  static cleanupOperationQueue() {
    // Operation queue has been removed - this method is no longer needed
    // Keeping for backward compatibility but removing the actual cleanup
    console.log('Operation queue cleanup skipped (operation queue removed)');
  }

  // Clean up sync data
  static cleanupSyncData() {
    try {
      // Remove old sync status if it's too large
      const syncStatus = localStorage.getItem('syncStatus');
      if (syncStatus && syncStatus.length > 10000) {
        localStorage.removeItem('syncStatus');
        console.log('Removed large sync status data');
      }
    } catch (error) {
      console.error('Error cleaning sync data:', error);
    }
  }

  // Compress large arrays by removing old items
  static compressLargeArrays() {
    const arrayKeys = ['expenses', 'wallet-transfers', 'budgets'];
    
    arrayKeys.forEach(key => {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const array = JSON.parse(data);
          if (Array.isArray(array) && array.length > 1000) {
            // Keep only the most recent 500 items (sorted by date if available)
            let sortedArray = array;
            if (array[0] && array[0].date) {
              sortedArray = array.sort((a, b) => new Date(b.date) - new Date(a.date));
            }
            const compressedArray = sortedArray.slice(0, 500);
            this.safeSetItem(key, JSON.stringify(compressedArray));
            console.log(`Compressed ${key}: ${array.length} -> ${compressedArray.length} items`);
          }
        }
      } catch (error) {
        console.error(`Error compressing ${key}:`, error);
      }
    });
  }

  // Get storage report
  static getStorageReport() {
    const usage = this.getCurrentUsage();
    const percentage = this.getUsagePercentage();
    const sizes = this.getAllKeySizes();
    
    return {
      totalUsage: usage,
      usagePercentage: percentage,
      isApproachingQuota: this.isApproachingQuota(),
      keySizes: sizes,
      largestKeys: Object.keys(sizes)
        .sort((a, b) => sizes[b] - sizes[a])
        .slice(0, 10)
        .map(key => ({ key, size: sizes[key] }))
    };
  }

  // Initialize monitoring
  static initializeMonitoring() {
    if (this.isInitialized) return;
    
    try {
      // Check usage on page load
      if (this.isApproachingQuota()) {
        console.warn(`LocalStorage usage is at ${this.getUsagePercentage().toFixed(1)}% - cleanup recommended`);
        this.performCleanup();
      }

      this.isInitialized = true;
      console.log('LocalStorage monitoring initialized');
    } catch (error) {
      console.error('Error initializing localStorage monitoring:', error);
    }
  }

  // Emergency cleanup - removes all non-essential data
  static emergencyCleanup() {
    try {
      console.log('🚨 Performing emergency localStorage cleanup...');
      
      const beforeUsage = this.getCurrentUsage();
      
      // Remove operation queue data (no longer used)
      localStorage.removeItem('operationQueue');
      
      // Keep only absolutely essential keys
      const essentialKeys = [
        'user', 
        'auth', 
        'settings', 
        'onboarding',
        'supabase.auth.token',
        'sb-mplrakcyrohgkqdhzpry-auth-token'
      ];
      
      const allKeys = Object.keys(localStorage);
      let removedCount = 0;
      
      allKeys.forEach(key => {
        if (!essentialKeys.some(essential => key.includes(essential))) {
          try {
            localStorage.removeItem(key);
            removedCount++;
          } catch (e) {
            console.warn('Failed to remove key:', key);
          }
        }
      });
      
      const afterUsage = this.getCurrentUsage();
      const freedBytes = beforeUsage - afterUsage;
      
      console.log('🎉 Emergency cleanup completed!');
      console.log('📊 Removed keys:', removedCount);
      console.log('💾 Storage freed:', (freedBytes / 1024).toFixed(2), 'KB');
      
      return {
        success: true,
        removedKeys: removedCount,
        freedBytes: freedBytes,
        beforeUsage: beforeUsage,
        afterUsage: afterUsage
      };
    } catch (error) {
      console.error('Emergency cleanup failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Initialize monitoring when module loads
if (typeof window !== 'undefined' && window.localStorage) {
  LocalStorageManager.initializeMonitoring();
}

export default LocalStorageManager; 