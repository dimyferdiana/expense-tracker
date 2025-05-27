/**
 * Utility to disable automatic sync functionality
 * This script ensures no automatic sync operations run
 */

import { getGlobalSyncManager } from './syncManager';

export const disableAutomaticSync = () => {
  console.log('🛑 Disabling automatic sync functionality...');
  
  try {
    // Get the existing sync manager if it exists
    const syncManager = getGlobalSyncManager();
    
    if (syncManager) {
      // Disable background sync
      if (typeof syncManager.setBackgroundSyncEnabled === 'function') {
        syncManager.setBackgroundSyncEnabled(false);
        console.log('✅ Background sync disabled');
      }
      
      // Clear any existing sync intervals
      if (syncManager.backgroundSyncInterval) {
        clearTimeout(syncManager.backgroundSyncInterval);
        syncManager.backgroundSyncInterval = null;
        console.log('✅ Background sync interval cleared');
      }
      
      // Cleanup the sync manager
      if (typeof syncManager.cleanup === 'function') {
        syncManager.cleanup();
        console.log('✅ Sync manager cleaned up');
      }
    }
    
    // Clear any sync-related localStorage items
    const syncKeys = [
      'backgroundSyncEnabled',
      'adaptiveInterval',
      'lastSuccessfulSync',
      'syncStatus'
    ];
    
    syncKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`✅ Cleared localStorage: ${key}`);
      }
    });
    
    // Set a flag to indicate automatic sync is disabled
    localStorage.setItem('automaticSyncDisabled', 'true');
    localStorage.setItem('automaticSyncDisabledAt', new Date().toISOString());
    
    console.log('✅ Automatic sync completely disabled');
    
    return {
      success: true,
      message: 'Automatic sync has been disabled successfully',
      disabledAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Error disabling automatic sync:', error);
    return {
      success: false,
      message: `Failed to disable automatic sync: ${error.message}`,
      error: error
    };
  }
};

export const isAutomaticSyncDisabled = () => {
  return localStorage.getItem('automaticSyncDisabled') === 'true';
};

export const getAutomaticSyncDisabledInfo = () => {
  const isDisabled = isAutomaticSyncDisabled();
  const disabledAt = localStorage.getItem('automaticSyncDisabledAt');
  
  return {
    isDisabled,
    disabledAt: disabledAt ? new Date(disabledAt) : null
  };
};

// Prevent any accidental re-enabling of automatic sync
export const preventAutomaticSyncReactivation = () => {
  // Override common sync-related functions to prevent accidental activation
  if (typeof window !== 'undefined') {
    const originalSetInterval = window.setInterval;
    const originalSetTimeout = window.setTimeout;
    
    // Intercept and block sync-related intervals/timeouts
    window.setInterval = function(callback, delay, ...args) {
      const callbackStr = callback.toString();
      if (callbackStr.includes('sync') || callbackStr.includes('Sync')) {
        console.warn('🛑 Blocked automatic sync interval:', callbackStr.substring(0, 100));
        return null;
      }
      return originalSetInterval.call(this, callback, delay, ...args);
    };
    
    window.setTimeout = function(callback, delay, ...args) {
      const callbackStr = callback.toString();
      if (callbackStr.includes('backgroundSync') || callbackStr.includes('autoSync')) {
        console.warn('🛑 Blocked automatic sync timeout:', callbackStr.substring(0, 100));
        return null;
      }
      return originalSetTimeout.call(this, callback, delay, ...args);
    };
  }
};

// Initialize the prevention system
if (isAutomaticSyncDisabled()) {
  preventAutomaticSyncReactivation();
  console.log('🛡️ Automatic sync prevention system active');
} 