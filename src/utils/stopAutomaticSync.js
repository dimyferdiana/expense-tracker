/**
 * Emergency stop for all automatic sync processes
 * Call this to immediately halt any background sync operations
 */

import { getGlobalSyncManager } from './syncManager';

export const stopAllAutomaticSync = () => {
  console.log('🛑 EMERGENCY STOP: Halting all automatic sync processes...');
  
  try {
    // Get the global sync manager
    const syncManager = getGlobalSyncManager();
    
    if (syncManager) {
      // Force disable background sync
      syncManager.syncStatus.backgroundSyncEnabled = false;
      
      // Clear any running intervals
      if (syncManager.backgroundSyncInterval) {
        clearTimeout(syncManager.backgroundSyncInterval);
        syncManager.backgroundSyncInterval = null;
        console.log('✅ Cleared background sync interval');
      }
      
      // Stop any in-progress sync
      if (syncManager.syncStatus.inProgress) {
        syncManager.syncStatus.inProgress = false;
        console.log('✅ Stopped in-progress sync');
      }
      
      // Clear sync status
      syncManager.saveStatusToLocalStorage();
      console.log('✅ Updated sync status');
    }
    
    // Clear all sync-related localStorage
    const syncKeys = [
      'backgroundSyncEnabled',
      'lastSyncTime',
      'hasLocalChanges',
      'syncStatus'
    ];
    
    syncKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Set emergency stop flag
    localStorage.setItem('automaticSyncStopped', 'true');
    localStorage.setItem('automaticSyncStoppedAt', new Date().toISOString());
    
    console.log('✅ All automatic sync processes stopped successfully');
    
    return {
      success: true,
      message: 'All automatic sync processes have been stopped',
      stoppedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Error stopping automatic sync:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Call this immediately when the module loads
stopAllAutomaticSync();

export default stopAllAutomaticSync; 