import React, { useState, useEffect } from 'react';
import { Combobox, ComboboxLabel, ComboboxOption } from './Combobox';
import TagSelector, { TagSelectorWithLabel } from './TagSelector';
import { categoryDB as supabaseCategoryDB, tagDB as supabaseTagDB, walletDB as supabaseWalletDB } from '../utils/supabase-db';
import DateRangePicker from './DateRangePicker';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotification';

function RecurringForm({ addRecurringTransaction, dbInitialized = false, onClose }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: 'food',
    tags: [],
    walletId: 'cash',
    isIncome: false,
    notes: '',
    frequency: 'monthly',
    startDate: new Date().toISOString().slice(0, 10), // YYYY-MM-DD format
    endDate: '', // Optional end date
    nextDate: new Date().toISOString().slice(0, 10), // Initial next occurrence date
  });
  
  const [categories, setCategories] = useState([
    { id: 'food', name: 'Food' },
    { id: 'transportation', name: 'Transportation' },
    { id: 'entertainment', name: 'Entertainment' },
    { id: 'utilities', name: 'Utilities' },
    { id: 'housing', name: 'Housing' },
    { id: 'healthcare', name: 'Healthcare' },
    { id: 'other', name: 'Other' }
  ]);

  const [tags, setTags] = useState([
    { id: 'essential', name: 'Essential' },
    { id: 'recurring', name: 'Recurring' },
    { id: 'emergency', name: 'Emergency' },
    { id: 'personal', name: 'Personal' },
    { id: 'work', name: 'Work' }
  ]);

  const [wallets, setWallets] = useState([
    { id: 'cash', name: 'Cash', type: 'cash', balance: 0 },
    { id: 'bank', name: 'Bank Account', type: 'bank', balance: 0 },
    { id: 'credit', name: 'Credit Card', type: 'credit_card', balance: 0 },
    { id: 'ewallet', name: 'E-Wallet', type: 'e_wallet', balance: 0 },
  ]);

  const frequencies = [
    { id: 'daily', name: 'Daily' },
    { id: 'weekly', name: 'Weekly' },
    { id: 'biweekly', name: 'Bi-weekly' },
    { id: 'monthly', name: 'Monthly' },
    { id: 'quarterly', name: 'Quarterly' },
    { id: 'annually', name: 'Annually' }
  ];

  // Add state for date picker
  const [activeDatePicker, setActiveDatePicker] = useState(null); // 'start', 'end', or null

  const { showError, showWarning } = useNotification();

  // Load categories and tags
  useEffect(() => {
    const loadData = async () => {
      try {
        if (dbInitialized && user) {
          // Load categories from Supabase
          const categoryData = await supabaseCategoryDB.getAll(user.id);
          if (categoryData.length > 0) {
            setCategories(categoryData);
            
            // Set default category if it exists in the loaded categories
            const defaultCategory = categoryData.find(cat => cat.id === 'food') || categoryData[0];
            if (defaultCategory) {
              setFormData(prev => ({ ...prev, category: defaultCategory.id }));
            }
          }

          // Load tags from Supabase
          const tagData = await supabaseTagDB.getAll(user.id);
          if (tagData.length > 0) {
            setTags(tagData);
          }

          // Load wallets from Supabase
          const walletData = await supabaseWalletDB.getAll(user.id);
          if (walletData.length > 0) {
            setWallets(walletData);
            // Set default wallet if not set
            setFormData(prev => ({ ...prev, walletId: prev.walletId || walletData[0].id }));
          }
        } else {
          // Fallback to localStorage
          loadFromLocalStorage();
        }
      } catch (error) {
        console.error('Error loading form data:', error);
        loadFromLocalStorage();
      }
    };

    loadData();
  }, [dbInitialized, user]);

  // Load categories from localStorage if needed
  const loadFromLocalStorage = () => {
    // Load categories
    const savedCategories = localStorage.getItem('expense-categories');
    if (savedCategories) {
      const parsedCategories = JSON.parse(savedCategories);
      setCategories(parsedCategories);
      
      // Set default category if it exists in the loaded categories
      const defaultCategory = parsedCategories.find(cat => cat.id === 'food') || parsedCategories[0];
      if (defaultCategory) {
        setFormData(prev => ({ ...prev, category: defaultCategory.id }));
      }
    }

    // Load tags
    const savedTags = localStorage.getItem('expense-tags');
    if (savedTags) {
      setTags(JSON.parse(savedTags));
    }

    // Load wallets
    const savedWallets = localStorage.getItem('wallets');
    if (savedWallets) {
      const parsedWallets = JSON.parse(savedWallets);
      setWallets(parsedWallets);
      setFormData(prev => ({ ...prev, walletId: prev.walletId || parsedWallets[0].id }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleToggleType = () => {
    setFormData({ ...formData, isIncome: !formData.isIncome });
  };

  const handleCategoryChange = (event) => {
    // Handle both direct category object and event object from Combobox
    const category = event?.target ? event.target.value : event;
    if (!category || !category.id) {
      console.error('Invalid category selected:', category);
      return;
    }
    setFormData({ ...formData, category: category.id });
  };

  const handleTagsChange = (selectedTags) => {
    setFormData(prev => ({
      ...prev,
      tags: selectedTags
    }));
  };

  const handleWalletChange = (event) => {
    // Handle both direct wallet object and event object from Combobox
    const wallet = event?.target ? event.target.value : event;
    if (!wallet || !wallet.id) {
      console.error('Invalid wallet selected:', wallet);
      return;
    }
    setFormData({ ...formData, walletId: wallet.id });
  };

  const handleFrequencyChange = (event) => {
    // Handle both direct frequency object and event object from Combobox
    const frequency = event?.target ? event.target.value : event;
    if (!frequency || !frequency.id) {
      console.error('Invalid frequency selected:', frequency);
      return;
    }
    setFormData({ ...formData, frequency: frequency.id });
  };

  const calculateNextDate = (startDate, frequency) => {
    const date = new Date(startDate);
    const today = new Date();
    
    // If start date is in the future, return it
    if (date > today) {
      return startDate;
    }
    
    // Otherwise, calculate the next occurrence based on frequency
    switch (frequency) {
      case 'daily':
        date.setDate(today.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(today.getDate() + (7 - today.getDay() + date.getDay()) % 7);
        if (date <= today) {
          date.setDate(date.getDate() + 7);
        }
        break;
      case 'biweekly':
        date.setDate(today.getDate() + (7 - today.getDay() + date.getDay()) % 7);
        if (date <= today) {
          date.setDate(date.getDate() + 14);
        }
        break;
      case 'monthly':
        // Move to next month with the same day
        date.setMonth(today.getMonth() + 1);
        date.setDate(Math.min(date.getDate(), new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
        break;
      case 'quarterly':
        // Move to 3 months later with the same day
        date.setMonth(today.getMonth() + 3);
        date.setDate(Math.min(date.getDate(), new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
        break;
      case 'annually':
        // Move to next year with the same month and day
        date.setFullYear(today.getFullYear() + 1);
        break;
      default:
        date.setMonth(today.getMonth() + 1);
    }
    
    return date.toISOString().slice(0, 10);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Simple validation
    if (!formData.name.trim() || !formData.amount || isNaN(formData.amount)) {
      showWarning('Please enter valid details');
      return;
    }
    
    // Calculate next occurrence date based on frequency
    const nextDate = calculateNextDate(formData.startDate, formData.frequency);

    try {
      // Make sure all values are properly formatted
      const transaction = {
        id: Date.now(), // Simple unique numeric ID
        name: formData.name.trim(),
        amount: parseFloat(formData.amount),
        category: formData.category,
        tags: formData.tags || [],
        walletId: formData.walletId,
        isIncome: formData.isIncome,
        notes: formData.notes ? formData.notes.trim() : '',
        frequency: formData.frequency,
        startDate: formData.startDate,
        endDate: formData.endDate,
        nextDate: nextDate
      };
      
      // Pass the transaction to the parent component
      addRecurringTransaction(transaction);
      
      // Reset form
      setFormData({
        name: '',
        amount: '',
        category: 'food',
        tags: [],
        walletId: 'cash',
        isIncome: false,
        notes: '',
        frequency: 'monthly',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '',
        nextDate: new Date().toISOString().slice(0, 10)
      });
      
    } catch (error) {
      showError('An error occurred when saving the recurring transaction. Please try again.');
      console.error('Error saving recurring transaction:', error);
    }
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

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header */}
      <div className="sticky top-0 left-0 right-0 px-6 py-4 bg-gray-800 border-b border-gray-700 z-10">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-indigo-300">Create Recurring Transaction</h2>
          <button
            type="button"
            className="text-gray-400 hover:text-white p-2 rounded-full bg-gray-700 bg-opacity-50"
            onClick={onClose}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto px-6 py-4 pt-2">
        {/* Transaction Type Toggle */}
        <div className="mb-4">
          <div className="flex bg-gray-700 rounded-md p-1">
            <button
              type="button"
              className={`flex-1 py-2 px-4 rounded ${!formData.isIncome ? 'bg-indigo-600 text-white' : 'text-gray-300'}`}
              onClick={() => !formData.isIncome || handleToggleType()}
            >
              Expense
            </button>
            <button
              type="button"
              className={`flex-1 py-2 px-4 rounded ${formData.isIncome ? 'bg-green-600 text-white' : 'text-gray-300'}`}
              onClick={() => formData.isIncome || handleToggleType()}
            >
              Income
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* Transaction Name */}
          <div className="mb-4">
            <label htmlFor="name" className="block text-gray-300 mb-1">Description</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="What's this transaction for?"
            />
          </div>
          
          {/* Amount */}
          <div className="mb-4">
            <label htmlFor="amount" className="block text-gray-300 mb-1">Amount</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">$</span>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                min="0.01"
                step="0.01"
                className="w-full pl-8 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0.00"
              />
            </div>
          </div>
          
          {/* Category */}
          <div className="mb-4">
            <ComboboxLabel htmlFor="category-select" className="block text-gray-300 mb-1">Category</ComboboxLabel>
            <Combobox
              id="category-select"
              name="category"
              value={categories.find(cat => cat.id === formData.category) || categories[0]}
              onChange={handleCategoryChange}
              options={categories}
              displayValue={(option) => option.name}
              aria-label="Select a category"
            >
              {(option) => (
                <ComboboxOption value={option}>
                  {option.name}
                </ComboboxOption>
              )}
            </Combobox>
          </div>
          
          {/* Tags */}
          <div className="mb-4">
            <TagSelectorWithLabel
              selectedTags={formData.tags}
              availableTags={tags}
              onChange={handleTagsChange}
              id="tags-select"
              dbInitialized={dbInitialized}
            />
          </div>
          
          {/* Wallet */}
          <div className="mb-4">
            <ComboboxLabel htmlFor="wallet-select" className="block text-gray-300 mb-1">Wallet</ComboboxLabel>
            <Combobox
              id="wallet-select"
              name="wallet"
              value={wallets.find(w => w.id === formData.walletId) || wallets[0]}
              onChange={handleWalletChange}
              options={wallets}
              displayValue={(option) => option.name}
              aria-label="Select a wallet"
            >
              {(option) => (
                <ComboboxOption value={option}>
                  {option.name} {option.balance !== undefined ? `($${option.balance})` : ''}
                </ComboboxOption>
              )}
            </Combobox>
          </div>
          
          {/* Frequency */}
          <div className="mb-4">
            <ComboboxLabel htmlFor="frequency-select" className="block text-gray-300 mb-1">Frequency</ComboboxLabel>
            <Combobox
              id="frequency-select"
              name="frequency"
              value={frequencies.find(f => f.id === formData.frequency) || frequencies[3]} // Monthly default
              onChange={handleFrequencyChange}
              options={frequencies}
              displayValue={(option) => option.name}
              aria-label="Select a frequency"
            >
              {(option) => (
                <ComboboxOption value={option}>
                  {option.name}
                </ComboboxOption>
              )}
            </Combobox>
          </div>
          
          {/* Start Date */}
          <div className="mb-4">
            <label htmlFor="startDate" className="block text-gray-300 mb-1">Start Date</label>
            <input
              type="text"
              id="startDate"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              placeholder="Select date"
              readOnly
              value={formData.startDate ? formatDateForDisplay(formData.startDate) : ''}
              onClick={() => setActiveDatePicker('start')}
            />
            {activeDatePicker === 'start' && (
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
          
          {/* End Date (Optional) */}
          <div className="mb-4">
            <label htmlFor="endDate" className="block text-gray-300 mb-1">End Date (Optional)</label>
            <input
              type="text"
              id="endDate"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              placeholder="Select date"
              readOnly
              value={formData.endDate ? formatDateForDisplay(formData.endDate) : ''}
              onClick={() => setActiveDatePicker('end')}
            />
            {activeDatePicker === 'end' && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 date-picker-container">
                <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-medium text-white">Select End Date</h4>
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
                      start: null,
                      end: formData.endDate ? new Date(formData.endDate) : null
                    }}
                    onChange={(range) => {
                      if (range.end || range.start) {
                        const dateString = (range.end || range.start).toISOString().slice(0, 10);
                        setFormData(prev => ({
                          ...prev,
                          endDate: dateString
                        }));
                      }
                      setActiveDatePicker(null);
                    }}
                    onClose={() => setActiveDatePicker(null)}
                    isSingleDatePicker={true}
                    pickerLabel="Select End Date"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Notes */}
          <div className="mb-4">
            <label htmlFor="notes" className="block text-gray-300 mb-1">Notes (Optional)</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none"
              placeholder="Add any additional details..."
            ></textarea>
          </div>
          
          <div className="pb-20">
            {/* Extra space at bottom for sticky footer */}
          </div>
        </form>
      </div>
      
      {/* Sticky footer */}
      <div className="sticky bottom-0 left-0 right-0 px-6 py-4 bg-gray-800 border-t border-gray-700 shadow-lg">
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Create Recurring Transaction
        </button>
      </div>
    </div>
  );
}

export default RecurringForm; 