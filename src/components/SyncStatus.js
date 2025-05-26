import React, { useState, useEffect } from 'react';
import { getGlobalSyncManager, useSyncManager } from '../utils/syncManager';
import { useAuth } from '../contexts/AuthContext';

const SyncStatus = ({ className = '' }) => {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [processingQueue, setProcessingQueue] = useState(false);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get sync status from sync manager
  useEffect(() => {
    const updateSyncStatus = () => {
      const syncManager = getGlobalSyncManager();
      if (syncManager) {
        const status = syncManager.getSyncStatus();
        setSyncStatus(status);
        setIsSyncing(status.inProgress);
        setLastSync(status.lastSync);
        setSyncError(status.errors.length > 0 ? status.errors[status.errors.length - 1] : null);
        setProcessingQueue(!!status.processingQueue);
      }
    };

    // Update immediately
    updateSyncStatus();

    // Update every 5 seconds
    const interval = setInterval(updateSyncStatus, 5000);

    return () => clearInterval(interval);
  }, [user]);

  // Manual sync trigger
  const handleManualSync = async () => {
    if (!user || isSyncing || !isOnline) return;

    const syncManager = getGlobalSyncManager();
    if (!syncManager) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      await syncManager.fullSync('bidirectional');
      console.log('Manual sync completed successfully');
    } catch (error) {
      console.error('Manual sync failed:', error);
      setSyncError({ message: error.message, timestamp: new Date().toISOString() });
    } finally {
      setIsSyncing(false);
    }
  };

  // Format last sync time
  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Get status icon and color
  const getStatusDisplay = () => {
    if (processingQueue) {
      return {
        icon: '⏳',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        text: 'Processing queue...'
      };
    }
    if (!isOnline) {
      return {
        icon: '📴',
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        text: 'Offline'
      };
    }

    if (isSyncing) {
      return {
        icon: '🔄',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        text: 'Syncing...'
      };
    }

    if (syncError) {
      return {
        icon: '⚠️',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        text: 'Sync Error'
      };
    }

    if (syncStatus?.hasLocalChanges) {
      return {
        icon: '📤',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        text: 'Pending'
      };
    }

    return {
      icon: '✅',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      text: 'Synced'
    };
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Status Indicator */}
      <div 
        className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${statusDisplay.color} ${statusDisplay.bgColor}`}
        title={`Last sync: ${formatLastSync(lastSync)}`}
      >
        <span className={isSyncing || processingQueue ? 'animate-spin' : ''}>{statusDisplay.icon}</span>
        <span className="hidden sm:inline">{statusDisplay.text}</span>
      </div>

      {/* Manual Sync Button */}
      {isOnline && !isSyncing && (
        <button
          onClick={handleManualSync}
          className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
          title="Manual sync"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}

      {/* Error Details (if any) */}
      {syncError && (
        <div className="text-xs text-red-600 max-w-xs truncate" title={syncError.message}>
          {syncError.message}
        </div>
      )}
    </div>
  );
};

export default SyncStatus; 