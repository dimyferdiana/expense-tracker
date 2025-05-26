// Safe Storage - Simple wrapper for localStorage operations
import LocalStorageManager from './localStorageManager';

// Safe localStorage.setItem wrapper
export const safeSetItem = (key, value) => {
  try {
    return LocalStorageManager.safeSetItem(key, value);
  } catch (error) {
    console.error(`Failed to save ${key} to localStorage:`, error);
    
    // If it's a quota error, try emergency cleanup
    if (error.message.includes('QUOTA') || error.name === 'QuotaExceededError') {
      console.warn('Attempting emergency cleanup due to quota error...');
      try {
        LocalStorageManager.emergencyCleanup();
        // Try one more time after cleanup
        return LocalStorageManager.safeSetItem(key, value);
      } catch (cleanupError) {
        console.error('Emergency cleanup failed:', cleanupError);
      }
    }
    
    throw error;
  }
};

// Safe localStorage.getItem wrapper (for consistency)
export const safeGetItem = (key) => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Failed to get ${key} from localStorage:`, error);
    return null;
  }
};

// Safe localStorage.removeItem wrapper
export const safeRemoveItem = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Failed to remove ${key} from localStorage:`, error);
    return false;
  }
};

// Check if localStorage is available and working
export const isStorageAvailable = () => {
  try {
    const testKey = 'storage-test-' + Date.now();
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
};

// Get storage usage report
export const getStorageReport = () => {
  return LocalStorageManager.getStorageReport();
};

// Perform cleanup
export const performCleanup = () => {
  return LocalStorageManager.performCleanup();
};

// Emergency cleanup
export const emergencyCleanup = () => {
  return LocalStorageManager.emergencyCleanup();
};

export default {
  setItem: safeSetItem,
  getItem: safeGetItem,
  removeItem: safeRemoveItem,
  isAvailable: isStorageAvailable,
  getReport: getStorageReport,
  cleanup: performCleanup,
  emergencyCleanup
}; 