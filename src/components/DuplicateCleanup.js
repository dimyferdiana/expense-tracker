import React, { useState, useEffect } from 'react';
import DuplicateDetector from '../utils/duplicateDetection';
import { DuplicateCleanupManager } from '../utils/duplicateCleanup';
import SupabaseDiagnostics from '../utils/supabase-diagnostics';
import CORSTroubleshootingGuide from './CORSTroubleshootingGuide';
import { useAuth } from '../contexts/AuthContext';
import { expenseDB as supabaseExpenseDB } from '../utils/supabase-db';
import { useNotification } from '../hooks/useNotification';

function DuplicateCleanup({ expenses, onCleanupComplete, dbInitialized = false }) {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useNotification();
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState(new Set());
  const [showTroubleshootingGuide, setShowTroubleshootingGuide] = useState(false);
  const [hasNetworkErrors, setHasNetworkErrors] = useState(false);

  // Scan for duplicates
  const scanForDuplicates = () => {
    setIsScanning(true);
    try {
      const groups = DuplicateDetector.findDuplicates(expenses);
      setDuplicateGroups(groups);
      
      if (groups.length === 0) {
        showSuccess('No duplicate transactions found!');
      } else {
        showWarning(`Found ${groups.length} groups of duplicate transactions.`);
      }
    } catch (error) {
      console.error('Error scanning for duplicates:', error);
      showError('Failed to scan for duplicates.');
    } finally {
      setIsScanning(false);
    }
  };

  // Auto-scan on component mount
  useEffect(() => {
    if (expenses.length > 0) {
      scanForDuplicates();
    }
  }, [expenses]);

  // Toggle group selection
  const toggleGroupSelection = (groupIndex) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupIndex)) {
      newSelected.delete(groupIndex);
    } else {
      newSelected.add(groupIndex);
    }
    setSelectedGroups(newSelected);
  };

  // Select all groups
  const selectAllGroups = () => {
    const allIndices = new Set(duplicateGroups.map((_, index) => index));
    setSelectedGroups(allIndices);
  };

  // Deselect all groups
  const deselectAllGroups = () => {
    setSelectedGroups(new Set());
  };

  // Remove selected duplicate groups
  const removeSelectedDuplicates = async () => {
    if (selectedGroups.size === 0) {
      showWarning('Please select duplicate groups to remove.');
      return;
    }

    const confirmMessage = `This will remove ${Array.from(selectedGroups).reduce((total, groupIndex) => {
      return total + (duplicateGroups[groupIndex].transactions.length - 1);
    }, 0)} duplicate transactions, keeping the most recent version of each. This action cannot be undone.\n\nContinue?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsRemoving(true);
    let removedCount = 0;
    let errorCount = 0;

    try {
      for (const groupIndex of selectedGroups) {
        const group = duplicateGroups[groupIndex];
        
        // Sort by last_modified or created_at, keep the most recent
        const sorted = group.transactions.sort((a, b) => {
          const dateA = new Date(a.last_modified || a.updated_at || a.created_at || a.date);
          const dateB = new Date(b.last_modified || b.updated_at || b.created_at || b.date);
          return dateB.getTime() - dateA.getTime();
        });

        // Remove all but the first (most recent)
        for (let i = 1; i < sorted.length; i++) {
          try {
            if (dbInitialized && user) {
              await supabaseExpenseDB.delete(sorted[i].id, user.id);
              // Track this as a cleaned duplicate to prevent restoration
              DuplicateCleanupManager.trackCleanedDuplicate(sorted[i].id, 'manual_duplicate_cleanup');
            } else {
              // Handle localStorage fallback if needed
              const savedExpenses = JSON.parse(localStorage.getItem('expenses') || '[]');
              const updatedExpenses = savedExpenses.filter(e => e.id !== sorted[i].id);
              localStorage.setItem('expenses', JSON.stringify(updatedExpenses));
              // Track this as a cleaned duplicate
              DuplicateCleanupManager.trackCleanedDuplicate(sorted[i].id, 'manual_duplicate_cleanup_local');
            }
            removedCount++;
          } catch (error) {
            console.error(`Failed to remove duplicate transaction ${sorted[i].id}:`, error);
            
            // Check if this is a CORS/network error
            if (error.message?.includes('NetworkError') || error.message?.includes('CORS') || error.message?.includes('fetch')) {
              console.warn('🚨 CORS/Network error detected during duplicate cleanup');
              setHasNetworkErrors(true);
              
              // Run diagnostics to help troubleshoot
              SupabaseDiagnostics.runDiagnostics().then(diagnostics => {
                console.log('🔍 Diagnostic results for CORS error:', diagnostics);
                
                // Show specific error message for CORS issues
                const corsRecommendations = diagnostics.recommendations
                  .filter(r => r.category === 'cors' || r.category === 'network' || r.category === 'connectivity')
                  .map(r => r.solution)
                  .join('\n');
                
                if (corsRecommendations) {
                  showError(`Network/CORS Error: ${error.message}\n\nClick "Troubleshoot Network Issues" for detailed help.`);
                }
              });
            }
            
            errorCount++;
          }
        }
      }

      if (removedCount > 0) {
        showSuccess(`Successfully removed ${removedCount} duplicate transactions.`);
        
        // Trigger refresh
        if (onCleanupComplete) {
          onCleanupComplete();
        }
        
        // Clear selections and rescan
        setSelectedGroups(new Set());
        setTimeout(() => {
          scanForDuplicates();
        }, 1000);
      }

      if (errorCount > 0) {
        showError(`Failed to remove ${errorCount} transactions. Please try again.`);
      }
    } catch (error) {
      console.error('Error during duplicate removal:', error);
      showError('Failed to remove duplicates. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  };

  // Format transaction for display
  const formatTransaction = (transaction) => {
    const amount = parseFloat(transaction.amount || 0);
    const date = new Date(transaction.date).toLocaleDateString();
    const description = transaction.description || transaction.name || 'No description';
    const type = transaction.is_income || transaction.isIncome ? 'Income' : 'Expense';
    
    return `${description} - $${amount.toFixed(2)} (${type}) - ${date}`;
  };

  if (duplicateGroups.length === 0 && !isScanning) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Duplicates Found</h3>
          <p className="text-gray-400 mb-4">Your transactions look clean!</p>
          <button
            onClick={scanForDuplicates}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Scan Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-white">Duplicate Transaction Cleanup</h3>
          <p className="text-gray-400 text-sm">
            {duplicateGroups.length > 0 
              ? `Found ${duplicateGroups.length} groups of duplicate transactions`
              : 'Scanning for duplicate transactions...'
            }
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={scanForDuplicates}
            disabled={isScanning}
            className="px-3 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            {isScanning ? 'Scanning...' : 'Rescan'}
          </button>
          {hasNetworkErrors && (
            <button
              onClick={() => setShowTroubleshootingGuide(true)}
              className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              🔧 Troubleshoot Network Issues
            </button>
          )}
        </div>
      </div>

      {duplicateGroups.length > 0 && (
        <>
          {/* Bulk actions */}
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-700 rounded-md">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-300">
                {selectedGroups.size} of {duplicateGroups.length} groups selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={selectAllGroups}
                  className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllGroups}
                  className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
                >
                  Deselect All
                </button>
              </div>
            </div>
            <button
              onClick={removeSelectedDuplicates}
              disabled={selectedGroups.size === 0 || isRemoving}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRemoving ? 'Removing...' : `Remove Selected (${Array.from(selectedGroups).reduce((total, groupIndex) => {
                return total + (duplicateGroups[groupIndex].transactions.length - 1);
              }, 0)} transactions)`}
            </button>
          </div>

          {/* Duplicate groups */}
          <div className="space-y-4">
            {duplicateGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedGroups.has(groupIndex)}
                      onChange={() => toggleGroupSelection(groupIndex)}
                      className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <h4 className="text-white font-medium">
                      Duplicate Group {groupIndex + 1}
                    </h4>
                    <span className="ml-2 px-2 py-1 bg-yellow-600 text-yellow-100 text-xs rounded">
                      {group.count} duplicates
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {group.transactions.map((transaction, transactionIndex) => {
                    const isNewest = transactionIndex === 0; // Assuming sorted by date
                    return (
                      <div
                        key={transaction.id}
                        className={`p-3 rounded-md text-sm ${
                          isNewest 
                            ? 'bg-green-900 border border-green-700' 
                            : 'bg-red-900 border border-red-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300">
                            {formatTransaction(transaction)}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded ${
                            isNewest 
                              ? 'bg-green-700 text-green-100' 
                              : 'bg-red-700 text-red-100'
                          }`}>
                            {isNewest ? 'Keep (Newest)' : 'Will Remove'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          ID: {transaction.id} | Modified: {new Date(transaction.last_modified || transaction.created_at || transaction.date).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      
      {/* Troubleshooting Guide Modal */}
      {showTroubleshootingGuide && (
        <CORSTroubleshootingGuide onClose={() => setShowTroubleshootingGuide(false)} />
      )}
    </div>
  );
}

export default DuplicateCleanup; 