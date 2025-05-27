import React, { useState, useEffect } from 'react';
import { DataPersistenceInfo } from '../utils/manualSyncManager';

const DataPersistenceInfoComponent = () => {
  const [persistenceInfo, setPersistenceInfo] = useState(null);
  const [storageEstimate, setStorageEstimate] = useState(null);

  useEffect(() => {
    const loadPersistenceInfo = async () => {
      const info = await DataPersistenceInfo.getEstimatedPersistence();
      setPersistenceInfo(info);

      // Get storage estimate
      try {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          setStorageEstimate(estimate);
        }
      } catch (error) {
        console.warn('Could not get storage estimate:', error);
      }
    };

    loadPersistenceInfo();
  }, []);

  const requestPersistentStorage = async () => {
    const granted = await DataPersistenceInfo.requestPersistentStorage();
    if (granted) {
      const info = await DataPersistenceInfo.getEstimatedPersistence();
      setPersistenceInfo(info);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Data Storage Information</h3>
      
      <div className="space-y-4">
        {/* Persistence Status */}
        <div className="p-4 bg-gray-50 rounded-md">
          <h4 className="font-medium text-gray-900 mb-2">Data Persistence</h4>
          {persistenceInfo ? (
            <div>
              <p className={`text-sm ${persistenceInfo.isPersistent ? 'text-green-700' : 'text-yellow-700'}`}>
                {persistenceInfo.isPersistent ? '✅' : '⚠️'} {persistenceInfo.message}
              </p>
              {!persistenceInfo.isPersistent && (
                <button
                  onClick={requestPersistentStorage}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Request Persistent Storage
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">Loading persistence info...</p>
          )}
        </div>

        {/* Storage Usage */}
        {storageEstimate && (
          <div className="p-4 bg-gray-50 rounded-md">
            <h4 className="font-medium text-gray-900 mb-2">Storage Usage</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Used:</span>
                <span>{formatBytes(storageEstimate.usage)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Available:</span>
                <span>{formatBytes(storageEstimate.quota)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ 
                    width: `${storageEstimate.quota ? (storageEstimate.usage / storageEstimate.quota) * 100 : 0}%` 
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-500">
                {storageEstimate.quota ? 
                  `${((storageEstimate.usage / storageEstimate.quota) * 100).toFixed(1)}% used` : 
                  'Usage percentage unknown'
                }
              </p>
            </div>
          </div>
        )}

        {/* Data Persistence Guarantees */}
        <div className="p-4 bg-blue-50 rounded-md">
          <h4 className="font-medium text-blue-900 mb-2">📚 Data Persistence Guarantees</h4>
          <div className="text-sm text-blue-800 space-y-2">
            <div>
              <h5 className="font-medium">✅ Your data WILL persist through:</h5>
              <ul className="ml-4 space-y-1">
                <li>• Browser restarts</li>
                <li>• Computer restarts</li>
                <li>• Network disconnections</li>
                <li>• App updates</li>
                <li>• Temporary browser crashes</li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-medium">⚠️ Your data MAY be lost if:</h5>
              <ul className="ml-4 space-y-1">
                <li>• You manually clear browser data/cookies</li>
                <li>• You use "Clear browsing data" in browser settings</li>
                <li>• Browser storage quota is exceeded (very rare)</li>
                <li>• You uninstall the browser (mobile)</li>
              </ul>
            </div>

            <div>
              <h5 className="font-medium">🛡️ How long does data last?</h5>
              <p className="ml-4">
                IndexedDB data typically persists <strong>indefinitely</strong> until manually cleared. 
                Modern browsers rarely auto-delete IndexedDB data, even when storage is low.
              </p>
            </div>
          </div>
        </div>

        {/* Backup Recommendations */}
        <div className="p-4 bg-yellow-50 rounded-md">
          <h4 className="font-medium text-yellow-800 mb-2">💡 Backup Recommendations</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Export your data weekly as a JSON file</li>
            <li>• Store backup files in cloud storage (Google Drive, Dropbox, etc.)</li>
            <li>• Use cloud backup feature if you have an account</li>
            <li>• Keep multiple backup versions for safety</li>
            <li>• Test restore process occasionally</li>
          </ul>
        </div>

        {/* Browser Compatibility */}
        <div className="p-4 bg-green-50 rounded-md">
          <h4 className="font-medium text-green-800 mb-2">🌐 Browser Compatibility</h4>
          <div className="text-sm text-green-700">
            <p className="mb-2">IndexedDB is supported by all modern browsers:</p>
            <div className="grid grid-cols-2 gap-2">
              <div>✅ Chrome/Edge 23+</div>
              <div>✅ Firefox 10+</div>
              <div>✅ Safari 7+</div>
              <div>✅ Mobile browsers</div>
            </div>
            <p className="mt-2 text-xs">
              Your data will sync across devices if you use the same browser with sync enabled.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataPersistenceInfoComponent; 