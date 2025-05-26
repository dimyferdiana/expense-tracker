// Storage Debugger - Utility for debugging localStorage issues
import LocalStorageManager from './localStorageManager';

export const StorageDebugger = {
  // Check current storage status
  checkStatus() {
    const report = LocalStorageManager.getStorageReport();
    console.log('=== LocalStorage Status ===');
    console.log(`Total Usage: ${(report.totalUsage / 1024).toFixed(2)} KB`);
    console.log(`Usage Percentage: ${report.usagePercentage.toFixed(1)}%`);
    console.log(`Approaching Quota: ${report.isApproachingQuota ? 'YES' : 'NO'}`);
    console.log('\n=== Largest Keys ===');
    report.largestKeys.forEach((item, index) => {
      console.log(`${index + 1}. ${item.key}: ${(item.size / 1024).toFixed(2)} KB`);
    });
    return report;
  },

  // List all localStorage keys with sizes
  listAll() {
    const sizes = LocalStorageManager.getAllKeySizes();
    console.log('=== All LocalStorage Keys ===');
    Object.entries(sizes)
      .sort(([,a], [,b]) => b - a)
      .forEach(([key, size]) => {
        console.log(`${key}: ${(size / 1024).toFixed(2)} KB`);
      });
    return sizes;
  },

  // Clean specific key
  cleanKey(key) {
    const sizeBefore = LocalStorageManager.getKeySize(key);
    localStorage.removeItem(key);
    console.log(`Removed ${key} (${(sizeBefore / 1024).toFixed(2)} KB)`);
    return sizeBefore;
  },

  // Perform cleanup
  cleanup() {
    console.log('Performing cleanup...');
    const beforeUsage = LocalStorageManager.getCurrentUsage();
    LocalStorageManager.performCleanup();
    const afterUsage = LocalStorageManager.getCurrentUsage();
    const saved = beforeUsage - afterUsage;
    console.log(`Cleanup complete. Freed ${(saved / 1024).toFixed(2)} KB`);
    return { beforeUsage, afterUsage, saved };
  },

  // Emergency cleanup
  emergencyCleanup() {
    console.log('Performing EMERGENCY cleanup...');
    const result = LocalStorageManager.emergencyCleanup();
    console.log(`Emergency cleanup complete. Freed ${(result.freedBytes / 1024).toFixed(2)} KB`);
    return result;
  },

  // Show specific key content (truncated)
  showKey(key, maxLength = 500) {
    const value = localStorage.getItem(key);
    if (!value) {
      console.log(`Key "${key}" not found`);
      return null;
    }
    
    console.log(`=== ${key} ===`);
    console.log(`Size: ${(value.length / 1024).toFixed(2)} KB`);
    
    if (value.length > maxLength) {
      console.log(`Content (first ${maxLength} chars):`);
      console.log(value.substring(0, maxLength) + '...');
    } else {
      console.log('Content:');
      console.log(value);
    }
    
    return value;
  },

  // Test localStorage write capability
  testWrite() {
    const testKey = 'storage-test-' + Date.now();
    const testData = 'x'.repeat(1000); // 1KB test data
    
    try {
      localStorage.setItem(testKey, testData);
      localStorage.removeItem(testKey);
      console.log('✅ LocalStorage write test passed');
      return true;
    } catch (error) {
      console.error('❌ LocalStorage write test failed:', error);
      return false;
    }
  },

  // Get quota estimate
  estimateQuota() {
    const testKey = 'quota-test-' + Date.now();
    let size = 0;
    const increment = 1024 * 100; // 100KB increments
    
    try {
      while (size < 50 * 1024 * 1024) { // Max 50MB test
        const testData = 'x'.repeat(increment);
        localStorage.setItem(testKey, testData);
        size += increment;
      }
    } catch (error) {
      localStorage.removeItem(testKey);
      console.log(`Estimated quota: ~${(size / 1024 / 1024).toFixed(1)} MB`);
      return size;
    }
    
    localStorage.removeItem(testKey);
    console.log('Could not determine quota (exceeded test limit)');
    return null;
  },

  // Emergency cleanup that can be called immediately
  immediateCleanup() {
    try {
      console.log('🚨 IMMEDIATE EMERGENCY CLEANUP STARTING...');
      
      const beforeUsage = JSON.stringify(localStorage).length;
      console.log('Storage before cleanup:', beforeUsage, 'bytes');
      
      // Keep only absolutely essential keys
      const essentialKeys = [
        'user', 
        'auth', 
        'settings', 
        'onboarding', 
        // 'wallets', // Temporarily remove wallets to see if it helps with stubborn quota issues
        'supabase.auth.token',
        'sb-mplrakcyrohgkqdhzpry-auth-token' // Common pattern for Supabase GoTrue token
      ];
      
      const allKeys = Object.keys(localStorage);
      let removedCount = 0;
      
      allKeys.forEach(key => {
        if (!essentialKeys.some(essential => key.includes(essential))) {
          try {
            localStorage.removeItem(key);
            removedCount++;
            console.log('✅ Removed:', key);
          } catch (e) {
            console.warn('❌ Failed to remove:', key, e);
          }
        } else {
          console.log('🔒 Kept essential:', key);
        }
      });
      
      const afterUsage = JSON.stringify(localStorage).length;
      const freedBytes = beforeUsage - afterUsage;
      
      console.log('🎉 IMMEDIATE CLEANUP COMPLETED!');
      console.log('📊 Removed keys:', removedCount);
      console.log('💾 Storage after cleanup:', afterUsage, 'bytes');
      console.log('🆓 Freed up:', freedBytes, 'bytes');
      console.log('📈 Storage reduction:', ((freedBytes / beforeUsage) * 100).toFixed(1) + '%');
      
      return {
        success: true,
        removedKeys: removedCount,
        freedBytes: freedBytes,
        beforeUsage: beforeUsage,
        afterUsage: afterUsage
      };
    } catch (error) {
      console.error('❌ Immediate cleanup failed:', error);
      return { success: false, error: error.message };
    }
  },

  // More aggressive cleanup for debugging persistent quota issues
  debugHardResetLocalStorage() {
    try {
      console.warn('💣 DEBUG HARD RESET: Clearing almost all localStorage items...');
      const preservedKeys = [
        'supabase.auth.token', // Supabase session token (adjust if your key is different)
        'sb-mplrakcyrohgkqdhzpry-auth-token' // Another common Supabase token key
        // Add any other absolutely critical keys that, if removed, break auth completely.
      ];
      let removedCount = 0;
      let keptCount = 0;

      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && !preservedKeys.some(pk => key.startsWith(pk))) {
          localStorage.removeItem(key);
          console.log(`💣 Removed: ${key}`);
          removedCount++;
        } else if (key) {
          console.log(`🔒 Kept by debugHardReset: ${key}`);
          keptCount++;
        }
      }
      console.warn(`💣 DEBUG HARD RESET COMPLETE: Removed ${removedCount} items, Kept ${keptCount} items.`);
      alert('DEBUG HARD RESET of localStorage complete. Please refresh the application.');
      return { success: true, removed: removedCount, kept: keptCount };
    } catch (error) {
      console.error('💣 DEBUG HARD RESET FAILED:', error);
      alert('DEBUG HARD RESET FAILED. Check console.');
      return { success: false, error: error.message };
    }
  },

  // Nuclear option - clear everything except auth tokens
  nuclearCleanup() {
    try {
      console.warn('☢️ NUCLEAR CLEANUP: Clearing ALL localStorage except auth tokens...');
      
      // Save only auth-related items
      const authTokens = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('auth') || key.includes('token') || key.includes('supabase'))) {
          authTokens[key] = localStorage.getItem(key);
          console.log(`🔒 Preserving auth key: ${key}`);
        }
      }
      
      // Clear everything
      localStorage.clear();
      
      // Restore auth tokens
      Object.keys(authTokens).forEach(key => {
        localStorage.setItem(key, authTokens[key]);
        console.log(`🔄 Restored auth key: ${key}`);
      });
      
      console.warn('☢️ NUCLEAR CLEANUP COMPLETE - localStorage cleared except auth tokens');
      return { success: true, preservedKeys: Object.keys(authTokens) };
    } catch (error) {
      console.error('☢️ NUCLEAR CLEANUP FAILED:', error);
      return { success: false, error: error.message };
    }
  },

  // Quick debug function for immediate use
  quickDebug() {
    console.log('=== QUICK STORAGE DEBUG ===');
    const usage = JSON.stringify(localStorage).length;
    console.log(`Total localStorage usage: ${(usage / 1024).toFixed(2)} KB`);
    
    // Show largest keys
    const sizes = {};
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        sizes[key] = localStorage[key].length;
      }
    }
    
    const sorted = Object.entries(sizes).sort(([,a], [,b]) => b - a);
    console.log('Top 5 largest keys:');
    sorted.slice(0, 5).forEach(([key, size], index) => {
      console.log(`${index + 1}. ${key}: ${(size / 1024).toFixed(2)} KB`);
    });
    
    // Test write capability
    try {
      const testKey = 'test-' + Date.now();
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      console.log('✅ localStorage write test: PASSED');
    } catch (error) {
      console.log('❌ localStorage write test: FAILED -', error.message);
    }
    
    return { usage, sizes: sorted };
  },

  // Arc browser specific cleanup - more aggressive
  arcBrowserCleanup() {
    try {
      console.warn('🌐 ARC BROWSER CLEANUP: Performing aggressive cleanup for Arc browser...');
      
      // Detect if we're in Arc browser
      const isArc = navigator.userAgent.includes('Arc') || 
                   window.chrome?.webstore || 
                   navigator.userAgent.includes('Chrome');
      
      if (!isArc) {
        console.log('Not Arc browser, using standard cleanup');
        return this.nuclearCleanup();
      }
      
      const beforeUsage = JSON.stringify(localStorage).length;
      console.log(`Arc browser detected. Storage before cleanup: ${(beforeUsage / 1024).toFixed(2)} KB`);
      
      // For Arc, only keep absolute essentials
      const arcEssentialKeys = [
        'supabase.auth.token',
        'sb-mplrakcyrohgkqdhzpry-auth-token',
        'auth',
        'user'
      ];
      
      let removedCount = 0;
      let keptCount = 0;
      
      // Get all keys first to avoid iteration issues
      const allKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        allKeys.push(localStorage.key(i));
      }
      
      // Remove everything except absolute essentials
      allKeys.forEach(key => {
        if (key && !arcEssentialKeys.some(essential => key.includes(essential))) {
          try {
            localStorage.removeItem(key);
            console.log(`🌐 Arc cleanup removed: ${key}`);
            removedCount++;
          } catch (e) {
            console.warn(`🌐 Arc cleanup failed to remove: ${key}`, e);
          }
        } else if (key) {
          console.log(`🔒 Arc cleanup kept: ${key}`);
          keptCount++;
        }
      });
      
      const afterUsage = JSON.stringify(localStorage).length;
      const freedBytes = beforeUsage - afterUsage;
      
      console.warn(`🌐 ARC BROWSER CLEANUP COMPLETE!`);
      console.log(`📊 Removed keys: ${removedCount}`);
      console.log(`🔒 Kept keys: ${keptCount}`);
      console.log(`💾 Storage after cleanup: ${(afterUsage / 1024).toFixed(2)} KB`);
      console.log(`🆓 Freed up: ${(freedBytes / 1024).toFixed(2)} KB`);
      console.log(`📈 Storage reduction: ${((freedBytes / beforeUsage) * 100).toFixed(1)}%`);
      
      // Force a page reload for Arc browser to clear any cached data
      if (freedBytes > 1024 * 100) { // If we freed more than 100KB
        console.warn('🌐 Arc browser: Significant cleanup performed. Recommend page reload.');
        if (window.confirm('Arc browser cleanup complete. Reload page to ensure clean state?')) {
          window.location.reload();
        }
      }
      
      return {
        success: true,
        browser: 'Arc',
        removedKeys: removedCount,
        keptKeys: keptCount,
        freedBytes: freedBytes,
        beforeUsage: beforeUsage,
        afterUsage: afterUsage
      };
    } catch (error) {
      console.error('🌐 Arc browser cleanup failed:', error);
      return { success: false, error: error.message };
    }
  },
};

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  window.StorageDebugger = StorageDebugger;
  console.log('StorageDebugger available globally. Try: StorageDebugger.checkStatus()');
}

export default StorageDebugger; 