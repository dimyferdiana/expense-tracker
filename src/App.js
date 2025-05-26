import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';
import supabase from './utils/supabase';

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
import { useNotification } from './hooks/useNotification';
import Onboarding from './components/Onboarding';
import { useOnboarding } from './hooks/useOnboarding';

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

  // Save expenses to localStorage (fallback)
  useEffect(() => {
    if (!supabaseInitialized && expenses.length > 0) {
      localStorage.setItem('expenses', JSON.stringify(expenses));
    }
  }, [expenses, supabaseInitialized]);

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
      
      const walletOps = createWalletOperations(user);
      const result = await walletOps.deleteExpenseWithWalletUpdate(id);
      
      console.log('Expense deleted and wallet balance restored:', result);
      
      await loadExpensesFromSupabase();
      setRefreshWallets(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting expense:', error);
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