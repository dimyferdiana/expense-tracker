import React, { useState } from 'react';
import { getManualSyncManager } from '../utils/manualSyncManager';
import { useAuth } from '../contexts/AuthContext';

const ManualSyncControls = () => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleUploadToCloud = async () => {
    if (!user) {
      showMessage('Please sign in to upload to cloud', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const syncManager = getManualSyncManager();
      const result = await syncManager.manualUploadToCloud();
      showMessage(`✅ ${result.message}`, 'success');
    } catch (error) {
      showMessage(`❌ Upload failed: ${error.message}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadFromCloud = async () => {
    if (!user) {
      showMessage('Please sign in to download from cloud', 'error');
      return;
    }

    setIsDownloading(true);
    try {
      const syncManager = getManualSyncManager();
      const result = await syncManager.manualDownloadFromCloud({ mergeWithLocal: true });
      showMessage(`✅ ${result.message}`, 'success');
    } catch (error) {
      showMessage(`❌ Download failed: ${error.message}`, 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const syncManager = getManualSyncManager();
      const exportData = await syncManager.exportLocalData();
      
      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showMessage('✅ Data exported successfully!', 'success');
    } catch (error) {
      showMessage(`❌ Export failed: ${error.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      const syncManager = getManualSyncManager();
      const result = await syncManager.importLocalData(importData, { replaceExisting: false });
      
      showMessage('✅ Data imported successfully!', 'success');
    } catch (error) {
      showMessage(`❌ Import failed: ${error.message}`, 'error');
    }
    
    // Reset file input
    event.target.value = '';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Manual Backup & Sync</h3>
      
      {message && (
        <div className={`mb-4 p-3 rounded-md ${
          messageType === 'error' 
            ? 'bg-red-50 text-red-700 border border-red-200' 
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cloud Operations */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">Cloud Backup (Optional)</h4>
          <button
            onClick={handleUploadToCloud}
            disabled={isUploading || !user}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload to Cloud
              </>
            )}
          </button>
          
          <button
            onClick={handleDownloadFromCloud}
            disabled={isDownloading || !user}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {isDownloading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Downloading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 11l3 3m0 0l3-3m-3 3V8" />
                </svg>
                Download from Cloud
              </>
            )}
          </button>
          
          {!user && (
            <p className="text-xs text-gray-500">Sign in to use cloud backup</p>
          )}
        </div>

        {/* Local Operations */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">Local Backup</h4>
          <button
            onClick={handleExportData}
            disabled={isExporting}
            className="w-full flex items-center justify-center px-4 py-2 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-green-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export to File
              </>
            )}
          </button>
          
          <label className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Import from File
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-md">
        <h4 className="font-medium text-blue-900 mb-2">💡 How it works</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• All your data is stored locally in your browser</li>
          <li>• Cloud backup is completely optional</li>
          <li>• Export creates a JSON file you can store anywhere</li>
          <li>• Your data persists until you manually clear browser data</li>
        </ul>
      </div>
    </div>
  );
};

export default ManualSyncControls; 