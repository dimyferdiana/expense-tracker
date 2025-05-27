import React, { useState, useEffect } from 'react';
import { getManualSyncManager } from '../utils/manualSyncManager';
import { useAuth } from '../contexts/AuthContext';

const OfflineFirstStatus = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const updateStatus = async () => {
      const syncManager = getManualSyncManager();
      if (syncManager) {
        const detailedStatus = await syncManager.getDetailedStatus();
        setStatus(detailedStatus);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 10000); // Update every 10s

    return () => clearInterval(interval);
  }, [user]);

  if (!status) return null;

  const getStatusIcon = () => {
    if (!status.isOnline) return '📴';
    if (status.hasLocalChanges) return '💾';
    if (status.lastManualSync) return '✅';
    return '📱';
  };

  const getStatusText = () => {
    if (!status.isOnline) return 'Offline Mode';
    if (status.hasLocalChanges) return 'Local Changes';
    if (status.lastManualSync) return 'Backed Up';
    return 'Local Only';
  };

  const formatDataAge = () => {
    if (!status.dataAge) return 'Never backed up';
    const { ageInDays, ageInHours } = status.dataAge;
    if (ageInDays > 0) return `${ageInDays}d ago`;
    if (ageInHours > 0) return `${ageInHours}h ago`;
    return 'Recently';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getStatusIcon()}</span>
          <div>
            <h3 className="font-medium text-gray-900">{getStatusText()}</h3>
            <p className="text-sm text-gray-500">
              {status.localDataCount.total} items • Last backup: {formatDataAge()}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          {showDetails ? 'Hide' : 'Details'}
        </button>
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Local Data</h4>
              <ul className="space-y-1 text-gray-600">
                <li>Expenses: {status.localDataCount.expenses}</li>
                <li>Categories: {status.localDataCount.categories}</li>
                <li>Wallets: {status.localDataCount.wallets}</li>
                <li>Transfers: {status.localDataCount.transfers}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Status</h4>
              <ul className="space-y-1 text-gray-600">
                <li>Connection: {status.isOnline ? '🟢 Online' : '🔴 Offline'}</li>
                <li>Changes: {status.hasLocalChanges ? '⚠️ Unsaved' : '✅ Saved'}</li>
                <li>Storage: {status.storageUsage ? `${Math.round(status.storageUsage.percentage)}%` : 'Unknown'}</li>
              </ul>
            </div>
          </div>

          {status.recommendations.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-md">
              <h4 className="font-medium text-yellow-800 mb-2">Recommendations</h4>
              <ul className="space-y-1">
                {status.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-yellow-700">
                    • {rec.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OfflineFirstStatus; 