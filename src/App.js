import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';
import supabase from './utils/supabase';
import LocalStorageManager from './utils/localStorageManager';
import StorageDebugger from './utils/storageDebugger';
import { safeSetItem, getStorageReport } from './utils/safeStorage';

// TailwindCSS versions
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import ExpenseSummary from './components/ExpenseSummary';
import ExpenseChart from './components/ExpenseChart';
import Settings from './components/Settings';
import BudgetManager from './components/BudgetManager';
import WalletTransfer from './components/WalletTransfer';
import BottomNavigation from './components/BottomNavigation';
import FloatingActionButton from './components/FloatingActionButton';
import Modal from './components/Modal';
import NotificationModal from './components/NotificationModal';
import Navbar from './components/Navbar';
import { 
  Dropdown, 
  DropdownButton, 
  DropdownDivider, 
  DropdownItem, 
  DropdownLabel, 
  DropdownMenu 
} from './components/Dropdown';
import { Avatar } from './components/Avatar';
import { initializeDatabase, expenseDB, categoryDB, walletDB, recurringDB, tagDB } from './utils/db';
import Wallets from './components/Wallets';
import WalletSummary from './components/WalletSummary';
import TransactionListPage from './pages/TransactionListPage';
import { 
  expenseDB as supabaseExpenseDB, 
  categoryDB as supabaseCategoryDB, 
  walletDB as supabaseWalletDB, 
  tagDB as supabaseTagDB, 
  recurringDB as supabaseRecurringDB,
  transferDB as supabaseTransferDB,
  initializeSupabaseDatabase 
} from './utils/supabase-db';
import SupabaseSetupPrompt from './components/SupabaseSetupPrompt';
import { createWalletOperations, WalletUtils } from './utils/walletOperations';
import WalletRepair from './utils/walletRepair';
import { useNotification } from './hooks/useNotification';
import Onboarding from './components/Onboarding';
import { useOnboarding } from './hooks/useOnboarding';

// Emergency cleanup function with Arc browser detection
const performEmergencyCleanup = () => {
  try {
    console.log('🚨 Performing emergency localStorage cleanup...');
    
    // Detect Arc browser
    const isArc = navigator.userAgent.includes('Arc') || 
                 (window.chrome && window.chrome.webstore) ||
                 navigator.userAgent.includes('Chrome');
    
    // Get current usage
    const beforeUsage = JSON.stringify(localStorage).length;
    console.log('Storage before cleanup:', beforeUsage, 'bytes');
    console.log('Browser detected:', isArc ? 'Arc/Chrome-based' : 'Other');
    
    // For Arc browser, be more aggressive
    const essentialKeys = isArc ? 
      ['user', 'auth', 'supabase.auth.token', 'sb-mplrakcyrohgkqdhzpry-auth-token'] :
      ['user', 'auth', 'settings', 'onboarding', 'supabase.auth.token'];
    
    const allKeys = Object.keys(localStorage);
    let removedCount = 0;
    
    allKeys.forEach(key => {
      if (!essentialKeys.some(essential => key.includes(essential))) {
        try {
          localStorage.removeItem(key);
          removedCount++;
          if (isArc) {
            console.log(`🌐 Arc cleanup removed: ${key}`);
          }
        } catch (e) {
          console.warn('Failed to remove key:', key);
        }
      } else {
        if (isArc) {
          console.log(`🔒 Arc cleanup kept: ${key}`);
        }
      }
    });
    
    const afterUsage = JSON.stringify(localStorage).length;
    console.log('Storage after cleanup:', afterUsage, 'bytes');
    console.log('✅ Emergency cleanup completed, freed up:', beforeUsage - afterUsage, 'bytes');
    console.log('📊 Removed keys:', removedCount);
    
    // For Arc browser, if we freed significant space, suggest reload
    if (isArc && (beforeUsage - afterUsage) > 1024 * 100) {
      console.warn('🌐 Arc browser: Significant cleanup performed. Consider reloading page.');
    }
    
    return true;
  } catch (error) {
    console.error('Emergency cleanup failed:', error);
    return false;
  }
};

// Perform immediate cleanup on app load
performEmergencyCleanup();

// Initialize localStorage monitoring early
LocalStorageManager.initializeMonitoring();

let lastQuotaErrorTime = 0;
let lastQuotaErrorSource = '';
const MIN_QUOTA_ERROR_INTERVAL = 2000; // 2 seconds

// Enhanced quota error handler
const handleQuotaError = (error, source = 'unknown') => {
  const now = Date.now();
  if (source === lastQuotaErrorSource && (now - lastQuotaErrorTime) < MIN_QUOTA_ERROR_INTERVAL) {
    console.warn(`🚨 Quota error handling for ${source} already attempted recently. Skipping.`);
    // Potentially re-throw or handle differently if it's a persistent loop
    // For now, just preventing re-entrant cleanup chaos
    return false; 
  }
  lastQuotaErrorTime = now;
  lastQuotaErrorSource = source;

  console.warn(`🚨 localStorage quota error detected from ${source}:`, error);
  
  try {
    // Immediate emergency cleanup
    performEmergencyCleanup();
    
    // Also try LocalStorageManager cleanup
    LocalStorageManager.emergencyCleanup();
    
    return true;
  } catch (cleanupError) {
    console.error('All cleanup methods failed:', cleanupError);
    return false;
  }
};

// Global error handler for localStorage quota issues
window.addEventListener('error', (event) => {
  if (event.error && (
    event.error.message.includes('QUOTA') || 
    event.error.name === 'QuotaExceededError' ||
    event.error.message.includes('quota exceeded')
  )) {
    handleQuotaError(event.error, 'window.error');
  }
});

// Global promise rejection handler for localStorage quota issues
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && (
    event.reason.message?.includes('QUOTA') || 
    event.reason.name === 'QuotaExceededError' ||
    event.reason.message?.includes('quota exceeded')
  )) {
    const handled = handleQuotaError(event.reason, 'unhandledrejection');
    if (handled) {
      // Prevent the error from being logged to console
      event.preventDefault();
    }
  }
});

// Override localStorage methods to catch quota errors immediately
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  // Aggressive logging for debugging quota issues
  const valueSize = typeof value === 'string' ? value.length : 0;
  console.log(`[localStorage.setItem] Attempting to set key: "${key}", Value size: ${valueSize} chars`);
  
  // Prevent extremely large writes (over 500KB)
  if (valueSize > 1024 * 500) {
    console.error(`🚨 BLOCKED: Attempted to write ${(valueSize / 1024).toFixed(2)} KB to key "${key}" - too large!`);
    throw new Error(`QUOTA_BYTES quota exceeded - attempted write too large: ${(valueSize / 1024).toFixed(2)} KB`);
  }
  
  if (valueSize > 1024 * 100) { // Log a warning for any writes over 100KB
    console.warn(`[localStorage.setItem] WARNING: Large write to key "${key}", Size: ${(valueSize / 1024).toFixed(2)} KB`);
    // To see the actual data (potentially very large and spammy, use with caution):
    // console.log('[localStorage.setItem] Value for large write:', value.substring(0, 200) + '...');
  }

  // Check current storage usage before writing
  const currentUsage = JSON.stringify(localStorage).length;
  const projectedUsage = currentUsage + valueSize;
  const STORAGE_LIMIT = 4 * 1024 * 1024; // 4MB limit to be safe
  
  if (projectedUsage > STORAGE_LIMIT) {
    console.warn(`🚨 Storage limit would be exceeded. Current: ${(currentUsage / 1024).toFixed(2)} KB, Projected: ${(projectedUsage / 1024).toFixed(2)} KB`);
    
    // Perform emergency cleanup before attempting write
    performEmergencyCleanup();
    
    // Check again after cleanup
    const newCurrentUsage = JSON.stringify(localStorage).length;
    const newProjectedUsage = newCurrentUsage + valueSize;
    
    if (newProjectedUsage > STORAGE_LIMIT) {
      console.error(`🚨 Still would exceed limit after cleanup. Blocking write to "${key}"`);
      throw new Error(`QUOTA_BYTES quota exceeded - storage limit reached even after cleanup`);
    }
  }

  try {
    return originalSetItem.call(this, key, value);
  } catch (error) {
    if (error.name === 'QuotaExceededError' || error.message.includes('QUOTA')) {
      console.error(`🚨 localStorage.setItem FAILED for key: "${key}" due to QuotaExceededError. Value size: ${valueSize} chars`);
      handleQuotaError(error, `localStorage.setItem for key: ${key}`);
      
      // Try again after cleanup
      try {
        console.log(`[localStorage.setItem] Retrying setItem for key: "${key}" after cleanup attempt.`);
        return originalSetItem.call(this, key, value);
      } catch (retryError) {
        console.error(`🚨 localStorage.setItem FAILED AGAIN for key: "${key}" even after cleanup.`, retryError);
        throw retryError; // Re-throw, let global handlers catch if needed
      }
    }
    // For other errors, just re-throw
    console.error(`[localStorage.setItem] Error setting key "${key}" (not quota related):`, error);
    throw error;
  }
};

// Main application content that requires authentication
const AppContent = () => {
  const { user, signOut, isSessionValid, refreshSession } = useAuth();
  const { notification, showError, hideNotification } = useNotification();
  const [activeTab, setActiveTab] = useState('home');
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshWallets, setRefreshWallets] = useState(0);
  const [supabaseInitialized, setSupabaseInitialized] = useState(false);
  const [supabaseError, setSupabaseError] = useState(null);
  const [showSupabasePrompt, setShowSupabasePrompt] = useState(false);

  // Initialize database
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        
        if (user) {
          const supabaseResult = await initializeSupabaseDatabase();
          setSupabaseInitialized(supabaseResult.success);
          
          if (supabaseResult.success) {
            await loadDataFromSupabase();
          } else {
            setSupabaseError(supabaseResult.message || 'Failed to initialize Supabase database');
            setShowSupabasePrompt(true);
            console.error('Supabase initialization failed:', supabaseResult);
            fallbackToLocalStorage();
          }
        }
      } catch (error) {
        console.error('Failed to initialize:', error);
        fallbackToLocalStorage();
      } finally {
        setIsLoading(false);
      }
    };
    
    init();
  }, [user]);

  // Load expenses and categories from Supabase
  const loadDataFromSupabase = async () => {
    try {
      if (!user) {
        console.error('Cannot load data: User not authenticated');
        return;
      }
      
      const expensesData = await supabaseExpenseDB.getAll(user.id);
      setExpenses(expensesData);
      
      const categoriesData = await supabaseCategoryDB.getAll(user.id);
      setCategories(categoriesData);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading data from Supabase:', error);
      fallbackToLocalStorage();
    }
  };

  const loadExpensesFromSupabase = async () => {
    await loadDataFromSupabase();
  };

  // Fallback to localStorage if IndexedDB fails
  const fallbackToLocalStorage = () => {
    const savedExpenses = localStorage.getItem('expenses');
    if (savedExpenses) {
      setExpenses(JSON.parse(savedExpenses));
    }
    
    const savedCategories = localStorage.getItem('expense-categories');
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    } else {
      const defaultCategories = [
        { id: 'food', name: 'Food', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
        { id: 'transportation', name: 'Transportation', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
        { id: 'entertainment', name: 'Entertainment', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
        { id: 'utilities', name: 'Utilities', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' },
        { id: 'housing', name: 'Housing', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
        { id: 'healthcare', name: 'Healthcare', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300' },
        { id: 'other', name: 'Other', color: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300' }
      ];
      setCategories(defaultCategories);
    }
    
    setIsLoading(false);
  };

  // Add new expense
  const addExpense = async (expense) => {
    try {
      if (!user) {
        console.error('Cannot add expense: User not authenticated');
        throw new Error('User not authenticated');
      }
      
      console.log('Adding expense with data:', expense);
      
      const walletOps = createWalletOperations(user);
      const result = await walletOps.addExpenseWithWalletUpdate(expense);
      
      console.log('Expense and wallet updated successfully:', result);
      
      setRefreshWallets(prev => prev + 1);
      await loadExpensesFromSupabase();
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error;
    }
  };

  // Update expense
  const updateExpense = async (updatedExpense) => {
    try {
      if (!user) {
        console.error('Cannot update expense: User not authenticated');
        return;
      }
      
      if (!(await isSessionValid())) {
        console.warn('Session expired, attempting to refresh...');
        try {
          await refreshSession();
        } catch (error) {
          console.error('Session refresh failed, user needs to re-authenticate');
          throw new Error('Your session has expired. Please sign in again.');
        }
      }
      
      const walletOps = createWalletOperations(user);
      const result = await walletOps.updateExpenseWithWalletUpdate(updatedExpense);
      
      console.log('Expense and wallet updated successfully:', result);
      
      await loadExpensesFromSupabase();
      setRefreshWallets(prev => prev + 1);
    } catch (error) {
      console.error('Error updating expense:', error);
      
      let userMessage = 'Failed to update expense. ';
      
      if (error.message.includes('not found')) {
        userMessage += 'One of the wallets associated with this expense may have been deleted. Please check your wallets and try again.';
      } else if (error.message.includes('Insufficient balance')) {
        userMessage += error.message;
      } else if (error.message.includes('session') || error.message.includes('authentication')) {
        userMessage += 'Your session has expired. Please sign in again.';
      } else {
        userMessage += 'Please try again or contact support if the problem persists.';
      }
      
      hideNotification();
      showError(userMessage);
      throw error;
    }
  };

  // Delete expense
  const deleteExpense = async (id) => {
    try {
      if (!user) {
        console.error('Cannot delete expense: User not authenticated');
        return;
      }
      
      // Detect Arc browser for more aggressive cleanup
      const isArc = navigator.userAgent.includes('Arc') || 
                   (window.chrome && window.chrome.webstore) ||
                   navigator.userAgent.includes('Chrome');
      
      // Perform cleanup before attempting delete to prevent quota issues
      try {
        if (isArc) {
          console.log('🌐 Arc browser detected - performing aggressive pre-delete cleanup');
          // Use the Arc-specific cleanup
          if (window.StorageDebugger) {
            window.StorageDebugger.arcBrowserCleanup();
          } else {
            performEmergencyCleanup();
          }
        } else {
          LocalStorageManager.performCleanup();
        }
      } catch (cleanupError) {
        console.warn('Cleanup before delete failed:', cleanupError);
      }
      
      const walletOps = createWalletOperations(user);
      const result = await walletOps.deleteExpenseWithWalletUpdate(id);
      
      console.log('Expense deleted and wallet balance restored:', result);
      
      await loadExpensesFromSupabase();
      setRefreshWallets(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting expense:', error);
      
      // Handle specific quota errors with Arc browser detection
      if (error.message?.includes('QUOTA') || error.name === 'QuotaExceededError') {
        console.warn('Quota error during delete, performing emergency cleanup...');
        
        const isArc = navigator.userAgent.includes('Arc') || 
                     (window.chrome && window.chrome.webstore) ||
                     navigator.userAgent.includes('Chrome');
        
        try {
          if (isArc) {
            console.log('🌐 Arc browser quota error - performing nuclear cleanup');
            // For Arc browser, use the most aggressive cleanup
            if (window.StorageDebugger) {
              const result = window.StorageDebugger.arcBrowserCleanup();
              if (result.success && result.freedBytes > 1024 * 50) {
                // If we freed significant space, suggest reload
                if (window.confirm('Arc browser storage cleaned. Reload page for best performance?')) {
                  window.location.reload();
                  return;
                }
              }
            } else {
              performEmergencyCleanup();
            }
          } else {
            performEmergencyCleanup();
            LocalStorageManager.emergencyCleanup();
          }
          
          // Retry the delete operation
          const walletOps = createWalletOperations(user);
          const result = await walletOps.deleteExpenseWithWalletUpdate(id);
          console.log('Expense deleted successfully after cleanup:', result);
          await loadExpensesFromSupabase();
          setRefreshWallets(prev => prev + 1);
          return;
        } catch (retryError) {
          console.error('Delete failed even after cleanup:', retryError);
          showError('Failed to delete expense due to storage limitations. Please try refreshing the page or clearing browser data.');
          return;
        }
      }
      
      // Handle other errors
      let userMessage = 'Failed to delete expense. ';
      
      if (error.message.includes('not found')) {
        userMessage += 'The expense may have already been deleted.';
      } else if (error.message.includes('session') || error.message.includes('authentication')) {
        userMessage += 'Your session has expired. Please sign in again.';
      } else {
        userMessage += 'Please try again or contact support if the problem persists.';
      }
      
      showError(userMessage);
      throw error;
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      );
    }

    switch (activeTab) {
      case 'wallets':
        return (
          <div className="space-y-6">
            <Wallets dbInitialized={supabaseInitialized} refresh={refreshWallets} />
            <WalletTransfer dbInitialized={supabaseInitialized} refreshWallets={refreshWallets} />
          </div>
        );
      case 'budgets':
        return <BudgetManager dbInitialized={supabaseInitialized} />;
      case 'settings':
        return <Settings dbInitialized={supabaseInitialized} />;
      case 'transfer':
        return <WalletTransfer dbInitialized={supabaseInitialized} refreshWallets={refreshWallets} />;
      case 'transactions':
        return (
          <TransactionListPage
            expenses={expenses}
            deleteExpense={deleteExpense}
            updateExpense={updateExpense}
            dbInitialized={supabaseInitialized}
          />
        );
      case 'home':
      default:
        return (
          <>
            <WalletSummary dbInitialized={supabaseInitialized} refresh={refreshWallets} />
            <ExpenseSummary 
              expenses={expenses} 
              total={expenses.reduce((sum, expense) => sum + expense.amount, 0)} 
            />
            <ExpenseChart expenses={expenses} categories={categories} />
            <ExpenseList 
              expenses={expenses} 
              deleteExpense={deleteExpense} 
              updateExpense={updateExpense} 
              dbInitialized={supabaseInitialized}
            />
          </>
        );
    }
  };

  return (
    <>
      {/* Supabase Setup Prompt */}
      {showSupabasePrompt && (
        <SupabaseSetupPrompt 
          error={supabaseError} 
          onClose={() => setShowSupabasePrompt(false)} 
        />
      )}

      {/* TailwindCSS Navbar */}
      <Navbar 
        user={user} 
        signOut={signOut} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        setIsModalOpen={setIsModalOpen} 
      />

      {/* Main content with TailwindCSS */}
      <div className="pt-16 pb-20 px-4 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </div>

      {/* Bottom Nav */}
      <BottomNavigation
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Floating Action Button - Hidden on desktop */}
        <div className="md:hidden">
          <FloatingActionButton onClick={() => setIsModalOpen(true)} />
        </div>

      {/* Add Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Transaction"
      >
        <ExpenseForm
          onSubmit={addExpense}
          onClose={() => setIsModalOpen(false)}
          dbInitialized={supabaseInitialized}
        />
      </Modal>

      {/* Notification Modal */}
      {notification && (
        <NotificationModal
          isOpen={notification.isOpen}
          onClose={hideNotification}
          title={notification.title}
          message={notification.message}
          type={notification.type}
          showCancel={notification.showCancel}
          onConfirm={notification.onConfirm}
          confirmText={notification.confirmText}
          cancelText={notification.cancelText}
        />
      )}
    </>
  );
};

// Main App component
function App() {
  const { hasSeenOnboarding, isLoading, completeOnboarding } = useOnboarding();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-white">Loading...</span>
      </div>
    );
  }

  return (
    <Routes>
      {/* Onboarding Route */}
      <Route 
        path="/onboarding" 
        element={
          <Onboarding 
            onComplete={() => {
              completeOnboarding();
              // Navigate to signup after completing onboarding
            }}
            onSkip={() => {
              completeOnboarding();
              // Navigate to signup when skipping
            }}
          />
        } 
      />
      
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppContent />
          </ProtectedRoute>
        }
      />
      
      {/* Default route - show onboarding if not seen, otherwise go to dashboard */}
      <Route 
        path="/" 
        element={
          hasSeenOnboarding ? 
            <Navigate to="/dashboard" replace /> : 
            <Navigate to="/onboarding" replace />
        } 
      />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;