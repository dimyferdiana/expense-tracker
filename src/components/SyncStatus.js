import React, { useState, useEffect } from 'react';
import { createSyncManager, SyncUtils } from '../utils/syncManager';
import { useAuth } from '../contexts/AuthContext';

const SyncStatus = ({ className = '' }) => {
  const { user } = useAuth();
  const [syncManager, setSyncManager] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [showSyncMenu, setShowSyncMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  useEffect(() => {
    if (user) {
      const manager = createSyncManager(user);
      setSyncManager(manager);
      
      // Update status periodically
      const updateStatus = () => {
        setSyncStatus(manager.getSyncStatus());
      };
      
      updateStatus();
      const interval = setInterval(updateStatus, 30000); // Update every 30s
      
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleSync = async (direction = 'bidirectional') => {
    if (!syncManager) return;
    
    setIsLoading(true);
    setLastSyncResult(null);
    
    try {
      const result = await syncManager.fullSync(direction);
      setSyncStatus(syncManager.getSyncStatus());
      setLastSyncResult(result);
      
      // Show success message
      const totalOps = Object.values(result.stats).reduce((sum, stat) => {
        return sum + (stat.uploaded || 0) + (stat.downloaded || 0);
      }, 0);
      
      if (totalOps > 0) {
        alert(`Sync completed! ${totalOps} items synced.`);
      } else {
        alert('Sync completed! Everything is up to date.');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus(syncManager.getSyncStatus());
      
      // Check if it's a database error
      if (error.message.includes('database') || error.message.includes('IDBDatabase') || error.message.includes('object store')) {
        const resetDb = window.confirm(`Sync failed due to database issues: ${error.message}\n\nWould you like to reset the local database? This will clear all local data and re-download from the cloud.`);
        if (resetDb) {
          await handleDatabaseReset();
        }
      } else {
        alert(`Sync failed: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDatabaseReset = async () => {
    if (!syncManager) return;
    
    setIsLoading(true);
    
    try {
      // Import database utilities
      const { resetDatabase } = await import('../utils/db');
      
      // Reset the local database
      const resetSuccessful = await resetDatabase();
      
      if (resetSuccessful) {
        alert('Database reset successful! The page will reload to refresh the data.');
        window.location.reload();
      } else {
        alert('Database reset failed. Please try refreshing the page.');
      }
    } catch (error) {
      console.error('Database reset failed:', error);
      alert(`Database reset failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!syncManager) return;
    
    setIsLoading(true);
    
    try {
      const data = await syncManager.exportLocalData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert(`Backup exported successfully! ${data.metadata.totalExpenses} expenses, ${data.metadata.totalWallets} wallets, and more.`);
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file || !syncManager) return;

    setIsLoading(true);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        if (window.confirm('This will replace all local data with the backup. Are you sure? This cannot be undone.')) {
          const result = await syncManager.importLocalData(data);
          setSyncStatus(syncManager.getSyncStatus());
          
          const totalImported = Object.values(result.stats).reduce((sum, stat) => {
            return sum + (stat.imported || 0);
          }, 0);
          
          alert(`Data imported successfully! ${totalImported} items restored.`);
          
          // Refresh the page to reload all data
          window.location.reload();
        }
      } catch (error) {
        console.error('Import failed:', error);
        alert(`Import failed: ${error.message}`);
      } finally {
        setIsLoading(false);
        // Clear the file input
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  if (!user || !syncStatus) return null;

  const isInProgress = syncStatus.inProgress || isLoading;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowSyncMenu(!showSyncMenu)}
        disabled={isInProgress}
        className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 text-sm disabled:opacity-50"
      >
        <span className={`text-lg ${isInProgress ? 'animate-spin' : ''}`}>
          {isInProgress ? '🔄' : SyncUtils.getSyncIcon(syncStatus)}
        </span>
        <span className="hidden md:block">
          {isInProgress ? 'Syncing...' : SyncUtils.formatSyncStatus(syncStatus)}
        </span>
      </button>

      {showSyncMenu && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-md shadow-lg py-2 z-50">
          <div className="px-4 py-2 border-b border-gray-700">
            <p className="text-sm font-medium text-white">Sync Status</p>
            <p className="text-xs text-gray-400">
              {isInProgress ? 'Syncing...' : SyncUtils.formatSyncStatus(syncStatus)}
            </p>
            {syncStatus.lastSync && (
              <p className="text-xs text-gray-500 mt-1">
                Last sync: {SyncUtils.formatLastSync(syncStatus.lastSync)}
              </p>
            )}
            {syncStatus.errors.length > 0 && (
              <p className="text-xs text-red-400 mt-1">
                {syncStatus.errors.length} error(s)
              </p>
            )}
          </div>
          
          <button
            onClick={() => handleSync('bidirectional')}
            disabled={isInProgress || !syncStatus.isOnline}
            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center disabled:opacity-50"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Full Sync
            {!syncStatus.isOnline && <span className="ml-auto text-xs">(Offline)</span>}
          </button>

          <button
            onClick={() => handleSync('upload')}
            disabled={isInProgress || !syncStatus.isOnline}
            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center disabled:opacity-50"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload to Cloud
            {!syncStatus.isOnline && <span className="ml-auto text-xs">(Offline)</span>}
          </button>

          <button
            onClick={() => handleSync('download')}
            disabled={isInProgress || !syncStatus.isOnline}
            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center disabled:opacity-50"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Download from Cloud
            {!syncStatus.isOnline && <span className="ml-auto text-xs">(Offline)</span>}
          </button>

          <div className="border-t border-gray-700 mt-2 pt-2">
            <button
              onClick={handleExport}
              disabled={isInProgress}
              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center disabled:opacity-50"
            >
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Backup
            </button>

            <label className="w-full cursor-pointer">
              <div className="px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center">
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Import Backup
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={isInProgress}
                className="hidden"
              />
            </label>
            
            <div className="border-t border-gray-700 mt-2 pt-2">
              <button
                onClick={() => {
                  if (window.confirm('Reset local database? This will clear all local data and require a fresh sync. Make sure you have a backup or your data is safely stored in the cloud.')) {
                    handleDatabaseReset();
                  }
                }}
                disabled={isInProgress}
                className="w-full text-left px-4 py-2 text-sm text-yellow-400 hover:bg-gray-700 hover:text-yellow-300 flex items-center disabled:opacity-50"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset Database
              </button>
            </div>
          </div>
          
          {syncStatus.errors.length > 0 && (
            <div className="border-t border-gray-700 mt-2 pt-2 px-4 py-2">
              <p className="text-xs text-red-400 mb-1">Recent Errors:</p>
              {syncStatus.errors.slice(-2).map((error, index) => (
                <p key={index} className="text-xs text-gray-400 truncate">
                  {error.message}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Click outside to close */}
      {showSyncMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowSyncMenu(false)}
        />
      )}
    </div>
  );
};

export default SyncStatus; 