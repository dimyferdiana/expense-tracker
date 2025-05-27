import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { initializeManualSyncManager, getManualSyncManager } from '../utils/manualSyncManager';
import OfflineFirstStatus from '../components/OfflineFirstStatus';
import ManualSyncControls from '../components/ManualSyncControls';
import DataPersistenceInfoComponent from '../components/DataPersistenceInfo';

const OfflineFirstSettings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Initialize manual sync manager when user changes
    if (user) {
      initializeManualSyncManager(user);
    }
  }, [user]);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'backup', name: 'Backup & Sync', icon: '💾' },
    { id: 'storage', name: 'Storage Info', icon: '💿' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Offline-First Settings</h1>
          <p className="mt-2 text-gray-600">
            Your data is stored locally with optional cloud backup. No automatic sync means no surprises.
          </p>
        </div>

        {/* Important Notice */}
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-2xl">🛡️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Automatic Sync Disabled
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  We've disabled all automatic cloud synchronization to prevent the duplicate issues you experienced. 
                  Your data is now stored locally-first, and you have complete control over when and how to back it up.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <OfflineFirstStatus />
              
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">How Offline-First Works</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-4xl mb-3">📱</div>
                    <h4 className="font-medium text-gray-900 mb-2">Local Storage</h4>
                    <p className="text-sm text-gray-600">
                      All your data is stored in your browser's IndexedDB. Works offline, fast access, no network required.
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-4xl mb-3">🎯</div>
                    <h4 className="font-medium text-gray-900 mb-2">Manual Control</h4>
                    <p className="text-sm text-gray-600">
                      You decide when to backup to cloud or export data. No automatic sync means no unexpected duplicates.
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-4xl mb-3">☁️</div>
                    <h4 className="font-medium text-gray-900 mb-2">Optional Cloud</h4>
                    <p className="text-sm text-gray-600">
                      Cloud backup is completely optional. Use it when you want, or stick to local exports.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">What Changed</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <span className="text-red-500 mr-3">❌</span>
                    <div>
                      <h4 className="font-medium text-gray-900">Removed: Automatic Background Sync</h4>
                      <p className="text-sm text-gray-600">No more automatic uploads that could create duplicates</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <span className="text-red-500 mr-3">❌</span>
                    <div>
                      <h4 className="font-medium text-gray-900">Removed: Auto-sync on Data Changes</h4>
                      <p className="text-sm text-gray-600">Changes are saved locally only until you manually backup</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <span className="text-green-500 mr-3">✅</span>
                    <div>
                      <h4 className="font-medium text-gray-900">Added: Manual Upload/Download Controls</h4>
                      <p className="text-sm text-gray-600">You control exactly when data moves to/from cloud</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <span className="text-green-500 mr-3">✅</span>
                    <div>
                      <h4 className="font-medium text-gray-900">Added: Local Export/Import</h4>
                      <p className="text-sm text-gray-600">Create JSON backups you can store anywhere</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <span className="text-green-500 mr-3">✅</span>
                    <div>
                      <h4 className="font-medium text-gray-900">Added: Before-Close Warnings</h4>
                      <p className="text-sm text-gray-600">Browser warns you if you have unsaved changes</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-6">
              <ManualSyncControls />
              
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Backup Strategy Recommendations</h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-md">
                    <h4 className="font-medium text-blue-900 mb-2">🏆 Recommended: Weekly Local Exports</h4>
                    <p className="text-sm text-blue-800">
                      Export your data as JSON files weekly and store them in your preferred cloud storage 
                      (Google Drive, Dropbox, iCloud, etc.). This gives you complete control and multiple backup versions.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-md">
                    <h4 className="font-medium text-green-900 mb-2">☁️ Optional: Manual Cloud Backup</h4>
                    <p className="text-sm text-green-800">
                      If you have an account, you can manually upload to our cloud when convenient. 
                      This is purely optional and only happens when you click the button.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-yellow-50 rounded-md">
                    <h4 className="font-medium text-yellow-900 mb-2">⚠️ Important: Test Your Backups</h4>
                    <p className="text-sm text-yellow-800">
                      Occasionally test importing your backup files to ensure they work correctly. 
                      A backup is only as good as your ability to restore from it.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'storage' && (
            <div className="space-y-6">
              <DataPersistenceInfoComponent />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineFirstSettings; 