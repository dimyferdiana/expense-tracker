import React, { useState, useEffect } from 'react';
import Badge from './Badge';
import { 
  categoryDB as supabaseCategoryDB, 
  tagDB as supabaseTagDB, 
  recurringDB as supabaseRecurringDB, 
  expenseDB as supabaseExpenseDB, 
  walletDB as supabaseWalletDB 
} from '../utils/supabase-db';
import { createWalletOperations, WalletUtils } from '../utils/walletOperations';
import { getColorName } from '../utils/colors';
import { useAuth } from '../contexts/AuthContext';
import { safeSetItem } from '../utils/safeStorage';

function RecurringList({ dbInitialized = false, refreshData }) {
  const [recurring, setRecurring] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Load recurring transactions
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [dbInitialized, refreshData, user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (dbInitialized && user) {
        // Load from Supabase
        const recurringData = await supabaseRecurringDB.getAll(user.id);
        setRecurring(recurringData);
        
        // Load categories and tags for display
        const categoryData = await supabaseCategoryDB.getAll(user.id);
        setCategories(categoryData);
        
        const tagData = await supabaseTagDB.getAll(user.id);
        setTags(tagData);
      } else {
        // Fallback to localStorage if needed
        const savedRecurring = localStorage.getItem('recurring-transactions');
        if (savedRecurring) {
          setRecurring(JSON.parse(savedRecurring));
        }
        
        // Load categories
        const savedCategories = localStorage.getItem('expense-categories');
        if (savedCategories) {
          setCategories(JSON.parse(savedCategories));
        }
        
        // Load tags
        const savedTags = localStorage.getItem('expense-tags');
        if (savedTags) {
          setTags(JSON.parse(savedTags));
        }
      }
    } catch (error) {
      console.error('Error loading recurring transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a transaction from a recurring item
  const createTransaction = async (recurringItem) => {
    try {
      // Create the transaction object
      const newTransaction = {
        description: recurringItem.name,
        amount: recurringItem.amount,
        category: recurringItem.category,
        tags: [...(recurringItem.tags || []), 'recurring'],
        wallet_id: recurringItem.walletId,
        is_income: recurringItem.is_income,
        notes: recurringItem.notes || '',
        date: recurringItem.nextDate,
        user_id: user.id
      };
      
      // Use the new WalletOperations utility for safe transaction handling
      const walletOps = createWalletOperations(user);
      const result = await walletOps.addExpenseWithWalletUpdate(newTransaction);
      
      console.log('Recurring transaction created successfully:', result);
      
      return result.expense;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  };

  // Delete a recurring transaction
  const deleteRecurring = async (id) => {
    try {
      if (dbInitialized && user) {
        await supabaseRecurringDB.delete(id, user.id);
      } else {
        // Fallback to localStorage
        const savedRecurring = JSON.parse(localStorage.getItem('recurring-transactions') || '[]');
        const updatedRecurring = savedRecurring.filter(item => item.id !== id);
        safeSetItem('recurring-transactions', JSON.stringify(updatedRecurring));
      }
      // Refresh the list
      loadData();
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
    }
  };

  // Process pending recurring transactions
  const processAllDue = async () => {
    if (!dbInitialized || !user) return;
    
    try {
      // Get all due transactions
      const dueTransactions = await supabaseRecurringDB.getDueTransactions(user.id);
      
      // Process each one
      for (const transaction of dueTransactions) {
        await createTransaction(transaction);
      }
      
      // Refresh the list
      loadData();
    } catch (error) {
      console.error('Error processing due transactions:', error);
    }
  };

  // Calculate next date based on frequency
  const calculateNextDate = (frequency, currentDate) => {
    const date = new Date(currentDate);
    
    switch (frequency) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'biweekly':
        date.setDate(date.getDate() + 14);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'annually':
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        date.setMonth(date.getMonth() + 1); // Default to monthly
    }
    
    return date.toISOString().slice(0, 10);
  };

  // Format human-readable frequency
  const formatFrequency = (frequency) => {
    const frequencies = {
      daily: 'Daily',
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      annually: 'Annually'
    };
    
    return frequencies[frequency] || frequency;
  };

  // Format category name
  const formatCategory = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : categoryId;
  };

  // Format rupiah with better precision
  const formatRupiah = (number) => {
    return WalletUtils.formatBalance(number);
  };

  // Get color for tag
  const getTagColor = (tagId) => {
    const tag = tags.find(t => t.id === tagId);
    return tag ? tag.color : 'gray';
  };

  // Format tag name
  const formatTagName = (tagId) => {
    const tag = tags.find(t => t.id === tagId);
    return tag ? tag.name : tagId;
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
        <h2 className="text-xl font-semibold mb-4 text-indigo-300">Recurring Transactions</h2>
        <div className="flex justify-center items-center py-8">
          <div className="text-indigo-400">
            <svg className="animate-spin h-8 w-8 mr-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-indigo-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (recurring.length === 0) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
        <h2 className="text-xl font-semibold mb-4 text-indigo-300">Recurring Transactions</h2>
        <div className="p-6 text-center">
          <p className="text-gray-400">No recurring transactions set up yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-indigo-300">Recurring Transactions</h2>
        <button 
          onClick={processAllDue}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          Process Due
        </button>
      </div>
      
      <div className="space-y-4">
        {recurring.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-lg ${
              item.is_income ? 'bg-gray-700/80 border-l-4 border-green-500' : 'bg-gray-700/80 border-l-4 border-red-500'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-medium text-white">{item.name}</div>
                <div className="text-sm text-gray-400 mt-1">
                  {formatCategory(item.category)}
                </div>
              </div>
              <div className={`font-medium ${item.is_income ? 'text-green-400' : 'text-red-400'}`}>
                {item.is_income ? '+' : '-'} Rp {formatRupiah(item.amount)}
              </div>
            </div>
            
            <div className="flex items-center mt-2 space-x-2">
              <span className="text-sm bg-indigo-900/50 text-indigo-300 px-2 py-1 rounded">
                {formatFrequency(item.frequency)}
              </span>
              <span className="text-sm bg-gray-900/50 text-gray-300 px-2 py-1 rounded">
                Next: {new Date(item.nextDate).toLocaleDateString()}
              </span>
            </div>
            
            {/* Notes if available */}
            {item.notes && (
              <div className="text-sm text-gray-400 mt-2 bg-gray-800/50 p-2 rounded">
                <span className="font-medium text-xs text-gray-500 block mb-1">Notes:</span>
                {item.notes}
              </div>
            )}
            
            <div className="flex justify-between items-center mt-3">
              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tagId) => (
                      <Badge 
                        key={`${item.id}-${tagId}`} 
                        color={getTagColor(tagId)}
                      >
                        {formatTagName(tagId)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Action buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => createTransaction(item)}
                  className="text-gray-400 hover:text-green-500 transition-colors duration-200"
                  title="Generate Transaction Now"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Delete this recurring transaction?')) {
                      deleteRecurring(item.id);
                    }
                  }}
                  className="text-gray-400 hover:text-red-500 transition-colors duration-200"
                  title="Delete Recurring Transaction"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecurringList; 