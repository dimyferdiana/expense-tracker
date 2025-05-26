import React, { useState, useEffect } from 'react';
import { 
  budgetDB as supabaseBudgetDB, 
  categoryDB as supabaseCategoryDB, 
  expenseDB as supabaseExpenseDB 
} from '../utils/supabase-db';
import Modal from './Modal';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotification';
import { safeSetItem } from '../utils/safeStorage';
import NotificationModal from './NotificationModal';
import DateRangePicker from './DateRangePicker';

const BudgetManager = ({ dbInitialized, refresh = 0 }) => {
  const { user } = useAuth();
  const { notification, showError, showSuccess, showConfirm, hideNotification } = useNotification();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expensesByCategory, setExpensesByCategory] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [activeDatePicker, setActiveDatePicker] = useState(null);
  
  // Filter states
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // Form states
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    period: 'monthly',
    startDate: new Date().toISOString().slice(0, 10),
    notes: ''
  });

  // Load budgets and categories
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        // Load categories
        if (dbInitialized && user) {
          const allCategories = await supabaseCategoryDB.getAll(user.id);
          setCategories(allCategories);
          
          // Load budgets
          const allBudgets = await supabaseBudgetDB.getAll(user.id);
          setBudgets(allBudgets);
          
          // Load expenses for the current month
          await loadExpensesForCurrentPeriod();
        } else {
          // Fallback to localStorage or default values
          const savedCategories = JSON.parse(localStorage.getItem('expense-categories') || '[]');
          setCategories(savedCategories.length > 0 ? savedCategories : getDefaultCategories());
          
          const savedBudgets = JSON.parse(localStorage.getItem('budgets') || '[]');
          setBudgets(savedBudgets);
          
          // Get expenses from localStorage and filter for current month
          const savedExpenses = JSON.parse(localStorage.getItem('expenses') || '[]');
          processExpensesForBudget(savedExpenses);
        }
      } catch (error) {
        console.error('Error loading budget data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [dbInitialized, currentMonth, refresh, user]);
  
  // Load expenses for the current period (month/week)
  const loadExpensesForCurrentPeriod = async () => {
    try {
      const allExpenses = await supabaseExpenseDB.getAll(user.id);
      processExpensesForBudget(allExpenses);
    } catch (error) {
      console.error('Error loading expenses for budget:', error);
    }
  };
  
  // Process expenses data to group by category
  const processExpensesForBudget = (expenses) => {
    const [year, month] = currentMonth.split('-').map(Number);
    
    // Filter expenses for the current month/year
    const filteredExpenses = expenses.filter(expense => {
      if (!expense.date) return false;
      
      const expenseDate = new Date(expense.date);
      return (
        expenseDate.getFullYear() === year &&
        expenseDate.getMonth() === month - 1 &&
        !expense.is_income // Only count expenses, not income
      );
    });
    
    // Group expenses by category
    const byCategory = filteredExpenses.reduce((acc, expense) => {
      const category = expense.category || 'other';
      if (!acc[category]) {
        acc[category] = {
          total: 0,
          expenses: []
        };
      }
      
      acc[category].total += parseFloat(expense.amount || 0);
      acc[category].expenses.push(expense);
      
      return acc;
    }, {});
    
    setExpensesByCategory(byCategory);
  };
  
  // Default categories if none loaded
  const getDefaultCategories = () => {
    return [
      { id: 'food', name: 'Food' },
      { id: 'transportation', name: 'Transportation' },
      { id: 'entertainment', name: 'Entertainment' },
      { id: 'utilities', name: 'Utilities' },
      { id: 'housing', name: 'Housing' },
      { id: 'healthcare', name: 'Healthcare' },
      { id: 'other', name: 'Other' }
    ];
  };
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Open modal to add a new budget
  const handleAddBudget = () => {
    setEditingBudget(null);
    setFormData({
      category: categories.length > 0 ? categories[0].id : '',
      amount: '',
      period: 'monthly',
      startDate: new Date().toISOString().slice(0, 10),
      notes: ''
    });
    setIsModalOpen(true);
  };
  
  // Open modal to edit an existing budget
  const handleEditBudget = (budget) => {
    setEditingBudget(budget);
    setFormData({
      category: budget.category,
      amount: budget.amount,
      period: budget.period || 'monthly',
      startDate: budget.startDate || new Date().toISOString().slice(0, 10),
      notes: budget.notes || ''
    });
    setIsModalOpen(true);
  };
  
  // Save new or updated budget
  const handleSaveBudget = async (e) => {
    e.preventDefault();
    
    if (!formData.category || !formData.amount) {
      showError('Please enter both category and amount.');
      return;
    }
    
    const budgetData = {
      category: formData.category,
      amount: parseFloat(formData.amount),
      period: formData.period,
      start_date: formData.startDate,      // Use snake_case to match database
      notes: formData.notes,
      created_at: new Date().toISOString() // Use snake_case to match database
    };
    
    try {
      if (editingBudget) {
        // Update existing budget
        budgetData.id = editingBudget.id;
        
        if (dbInitialized && user) {
          await supabaseBudgetDB.update(budgetData, user.id);
        } else {
          // Update in localStorage
          const savedBudgets = JSON.parse(localStorage.getItem('budgets') || '[]');
          const updatedBudgets = savedBudgets.map(b => 
            b.id === editingBudget.id ? budgetData : b
          );
          safeSetItem('budgets', JSON.stringify(updatedBudgets));
          setBudgets(updatedBudgets);
        }
      } else {
        // Add new budget
        // Don't set ID manually for database - let it auto-generate
        if (dbInitialized && user) {
          await supabaseBudgetDB.add(budgetData, user.id);
        } else {
          // Only set ID for localStorage
          budgetData.id = Date.now();
          const savedBudgets = JSON.parse(localStorage.getItem('budgets') || '[]');
          savedBudgets.push(budgetData);
          safeSetItem('budgets', JSON.stringify(savedBudgets));
          setBudgets(savedBudgets);
        }
      }
      
      // Reload budgets
      if (dbInitialized && user) {
        const allBudgets = await supabaseBudgetDB.getAll(user.id);
        setBudgets(allBudgets);
      }
      
      // Close modal
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving budget:', error);
      showError('Failed to save budget. Please try again.');
    }
  };
  
  // Delete a budget
  const handleDeleteBudget = async (id) => {
    showConfirm(
      'Are you sure you want to delete this budget? This action cannot be undone.',
      async () => {
        try {
          if (dbInitialized && user) {
            await supabaseBudgetDB.delete(id, user.id);
            const allBudgets = await supabaseBudgetDB.getAll(user.id);
            setBudgets(allBudgets);
          } else {
            // Delete from localStorage
            const savedBudgets = JSON.parse(localStorage.getItem('budgets') || '[]');
            const updatedBudgets = savedBudgets.filter(b => b.id !== id);
            safeSetItem('budgets', JSON.stringify(updatedBudgets));
            setBudgets(updatedBudgets);
          }
          showSuccess('Budget deleted successfully.');
        } catch (error) {
          console.error('Error deleting budget:', error);
          showError('Failed to delete budget. Please try again.');
        }
      },
      'Delete Budget'
    );
  };
  
  // Handle month change
  const handleMonthChange = (e) => {
    setCurrentMonth(e.target.value);
  };
  
  // Calculate budget usage percentage
  const calculateUsage = (budget) => {
    const categoryExpenses = expensesByCategory[budget.category] || { total: 0 };
    const percentage = (categoryExpenses.total / parseFloat(budget.amount)) * 100;
    return Math.min(percentage, 100); // Cap at 100% for UI
  };
  
  // Determine if over budget
  const isOverBudget = (budget) => {
    const categoryExpenses = expensesByCategory[budget.category] || { total: 0 };
    return categoryExpenses.total > parseFloat(budget.amount);
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR', 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Get category name from ID
  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : categoryId;
  };

  // Format a date string as a human-readable date
  const formatDateForDisplay = (date) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-indigo-400">
          <svg className="animate-spin h-10 w-10 mr-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p className="text-indigo-300 text-lg font-medium">Loading budgets...</p>
      </div>
    );
  }

  return (
    <div className="py-4 pb-24 md:pb-6">
      {/* Mobile optimized header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
        <h2 className="text-xl md:text-2xl font-semibold text-indigo-300 mb-4 md:mb-0">Budget Manager</h2>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="w-full sm:w-auto">
            <input
              type="month"
              value={currentMonth}
              onChange={handleMonthChange}
              className="w-full rounded-md bg-gray-800 border border-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={handleAddBudget}
            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Budget
          </button>
        </div>
      </div>
      
      {budgets.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-6 sm:p-8 text-center border border-gray-700">
          <div className="mx-auto w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Budgets Set</h3>
          <p className="text-gray-400 mb-6">
            Start managing your finances by setting up a budget for different categories.
          </p>
          <button
            onClick={handleAddBudget}
            className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Create Your First Budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {budgets.map(budget => {
            const usage = calculateUsage(budget);
            const overBudget = isOverBudget(budget);
            const categoryExpenses = expensesByCategory[budget.category] || { total: 0 };
            
            return (
              <div 
                key={budget.id}
                className="bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-700 relative"
              >
                {overBudget && (
                  <div className="absolute top-3 right-3 bg-red-900/70 text-red-300 text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full font-medium">
                    Over Budget
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-base md:text-lg font-semibold text-white">
                      {getCategoryName(budget.category)}
                    </h3>
                    <p className="text-gray-400 text-xs md:text-sm">
                      {budget.period === 'monthly' ? 'Monthly Budget' : 'Weekly Budget'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleEditBudget(budget)}
                      className="p-1.5 md:p-2 text-gray-400 hover:text-white transition-colors"
                      aria-label="Edit budget"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => handleDeleteBudget(budget.id)}
                      className="p-1.5 md:p-2 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Delete budget"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <div className="font-semibold text-white text-sm md:text-base">{formatCurrency(categoryExpenses.total)}</div>
                    <div className="text-gray-400 text-sm md:text-base">of {formatCurrency(budget.amount)}</div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2.5 md:h-3 mb-1">
                    <div 
                      className={`h-2.5 md:h-3 rounded-full ${
                        usage > 90 ? 'bg-red-500' : 
                        usage > 70 ? 'bg-yellow-500' : 
                        'bg-green-500'
                      }`}
                      style={{ width: `${usage}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {overBudget 
                      ? `${formatCurrency(categoryExpenses.total - budget.amount)} over budget` 
                      : `${formatCurrency(budget.amount - categoryExpenses.total)} remaining`}
                  </div>
                </div>
                
                {budget.notes && (
                  <div className="text-xs md:text-sm text-gray-400 mt-3 border-t border-gray-700 pt-2 md:pt-3">
                    <p>{budget.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Add/Edit Budget Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            {editingBudget ? 'Edit Budget' : 'Add New Budget'}
          </h2>
          
          <form onSubmit={handleSaveBudget}>
            <div className="mb-4">
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Budget Amount
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0"
                min="0"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Period
              </label>
              <select
                name="period"
                value={formData.period}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            
            <div className="mb-4 relative">
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Start Date
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                placeholder="Select date"
                readOnly
                value={formData.startDate ? formatDateForDisplay(formData.startDate) : ''}
                onClick={() => setActiveDatePicker('startDate')}
              />
              {activeDatePicker === 'startDate' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 date-picker-container">
                  <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-medium text-white">Select Start Date</h4>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-white p-2 rounded-full"
                        onClick={() => setActiveDatePicker(null)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <DateRangePicker
                      value={{
                        start: formData.startDate ? new Date(formData.startDate) : null,
                        end: null
                      }}
                      onChange={(range) => {
                        if (range.start) {
                          const dateString = range.start.toISOString().slice(0, 10);
                          setFormData(prev => ({
                            ...prev,
                            startDate: dateString
                          }));
                        }
                        setActiveDatePicker(null);
                      }}
                      onClose={() => setActiveDatePicker(null)}
                      isSingleDatePicker={true}
                      pickerLabel="Select Start Date"
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Notes (Optional)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows="3"
                placeholder="Add any details or reminders about this budget"
              ></textarea>
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="mr-4 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                {editingBudget ? 'Save Changes' : 'Create Budget'}
              </button>
            </div>
          </form>
        </div>
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
    </div>
  );
};

export default BudgetManager; 