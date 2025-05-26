import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Combobox, ComboboxLabel, ComboboxOption } from './Combobox';
import { TagSelectorWithLabel } from './TagSelector';
import { categoryDB as supabaseCategoryDB, tagDB as supabaseTagDB, walletDB as supabaseWalletDB } from '../utils/supabase-db';
import DateRangePicker from './DateRangePicker';
import Badge from './Badge';
import { getColorName } from '../utils/colors';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotification';
import { safeSetItem } from '../utils/safeStorage';
import NotificationModal from './NotificationModal';

function ExpenseEditModal({ expense, onSave, onCancel, onDelete, dbInitialized = false }) {
  const { user } = useAuth();
  const { notification, showError, showWarning, showConfirm, hideNotification } = useNotification();
  
  const [formData, setFormData] = useState({
    id: expense.id,
    description: expense.description || '',
    amount: expense.amount || '',
    category: expense.category || 'other',
    tags: expense.tags || [],
    wallet_id: expense.wallet_id || null,
    is_income: expense.is_income || false,
    notes: expense.notes || '',
    photoUrl: expense.photo_url || '',
    date: expense.date || new Date().toISOString().slice(0, 10),
    time: expense.time || new Date().toTimeString().slice(0, 5)
  });
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(expense.photo_url || '');
  
  // Add state for date picker
  const [activeDatePicker, setActiveDatePicker] = useState(null); // 'date' or null
  
  // Add state for time picker
  const [activeTimePicker, setActiveTimePicker] = useState(null); // 'time' or null
  
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [wallets, setWallets] = useState([
    { id: 'cash', name: 'Cash', type: 'cash', balance: 0 },
    { id: 'bank', name: 'Bank Account', type: 'bank', balance: 0 },
    { id: 'credit', name: 'Credit Card', type: 'credit_card', balance: 0 },
    { id: 'ewallet', name: 'E-Wallet', type: 'e_wallet', balance: 0 },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(
    categories.find(cat => cat.id === expense.category) || null
  );

  // Load categories and tags
  useEffect(() => {
    const loadData = async () => {
      try {
        if (dbInitialized && user) {
          // Load categories from Supabase
          const categoryData = await supabaseCategoryDB.getAll(user.id);
          if (categoryData.length > 0) {
            setCategories(categoryData);
            // Set selected category
            const selectedCat = categoryData.find(cat => cat.id === expense.category);
            if (selectedCat) {
              setSelectedCategory(selectedCat);
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
            // Set the wallet_id from the expense if it exists
            if (expense.wallet_id) {
              setFormData(prev => ({ ...prev, wallet_id: expense.wallet_id }));
            } else if (!formData.wallet_id) {
              // Only set default wallet if no wallet_id exists
              setFormData(prev => ({ ...prev, wallet_id: walletData[0].id }));
            }
          }
        } else {
          // Fallback to localStorage
          loadFromLocalStorage();
          loadTagsFromLocalStorage();
        }
      } catch (error) {
        console.error('Error loading data:', error);
        loadFromLocalStorage();
        loadTagsFromLocalStorage();
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [dbInitialized, expense.category, expense.wallet_id, user, formData.wallet_id]);

  // Load categories from localStorage if needed
  const loadFromLocalStorage = useCallback(() => {
    const savedCategories = localStorage.getItem('expense-categories');
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    }
    // Load wallets
    const savedWallets = localStorage.getItem('wallets');
    if (savedWallets) {
      const parsedWallets = JSON.parse(savedWallets);
      setWallets(parsedWallets);
      // Only set default wallet if wallet_id is null
      if (!formData.wallet_id) {
        setFormData(prev => ({ ...prev, wallet_id: parsedWallets[0].id }));
      }
    }
  }, [formData.wallet_id]);

  // Load tags from localStorage if needed
  const loadTagsFromLocalStorage = useCallback(() => {
    const savedTags = localStorage.getItem('expense-tags');
    if (savedTags) {
      setTags(JSON.parse(savedTags));
    } else {
      // Default tags if none found
      setTags([
        { id: 'essential', name: 'Essential' },
        { id: 'recurring', name: 'Recurring' },
        { id: 'emergency', name: 'Emergency' },
        { id: 'personal', name: 'Personal' },
        { id: 'work', name: 'Work' }
      ]);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setFormData({ ...formData, category: category.id });
    setCategorySearchQuery(''); // Clear search when selecting
  };

  const handleTagsChange = (selectedTags) => {
    // Ensure we're only storing tag IDs
    const tagIds = selectedTags.map(tag => 
      typeof tag === 'object' && tag !== null ? tag.id : tag
    );
    setFormData(prev => ({
      ...prev,
      tags: tagIds
    }));
  };

  const handleWalletChange = (event) => {
    // Handle both direct wallet object and event object from Combobox
    const wallet = event?.target ? event.target.value : event;
    if (!wallet || !wallet.id) {
      console.error('Invalid wallet selected:', wallet);
      return;
    }
    setFormData(prev => ({ ...prev, wallet_id: wallet.id }));
  };

  const handleToggleType = () => {
    setFormData({ ...formData, is_income: !formData.is_income });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file type is image
    if (!file.type.startsWith('image/')) {
      showWarning('Please select an image file');
      return;
    }
    
    // Check file size is less than 5MB
    if (file.size > 5 * 1024 * 1024) {
      showWarning('File size should be less than 5MB');
      return;
    }
    
    // Convert to base64 for storage
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData({ ...formData, photoUrl: event.target.result });
      setPreviewUrl(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setFormData({ ...formData, photoUrl: '' });
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const takePicture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAddNewCategoryClick = () => {
    setShowNewCategoryInput(true);
  };

  const handleNewCategoryInputChange = (e) => {
    setNewCategoryName(e.target.value);
  };

  const handleSaveNewCategory = async () => {
    if (!newCategoryName.trim()) return;

    const newCategory = {
      name: newCategoryName.trim(),
    };

    try {
      if (dbInitialized && user) {
        // Add the category to Supabase
        const savedCategory = await supabaseCategoryDB.add(newCategory, user.id);
        // Reload categories to get the updated list with database-generated IDs
        const updatedCategories = await supabaseCategoryDB.getAll(user.id);
        setCategories(updatedCategories);
        setFormData(prev => ({ ...prev, category: savedCategory.id })); // Select the new category
      } else {
        // Fallback to localStorage - generate ID for local storage
        const localCategory = {
          id: newCategoryName.trim().toLowerCase().replace(/\s+/g, '-'),
          ...newCategory
        };
        const updatedCategories = [...categories, localCategory];
        setCategories(updatedCategories);
        try {
          safeSetItem('expense-categories', JSON.stringify(updatedCategories));
        } catch (storageError) {
          console.error('Failed to save categories to localStorage:', storageError);
          showError('Failed to save category due to storage limitations.');
          return;
        }
        setFormData(prev => ({ ...prev, category: localCategory.id })); // Select the new category
      }
      setNewCategoryName('');
      setShowNewCategoryInput(false);
    } catch (error) {
      showError('Failed to add new category.');
    }
  };

  const handleCancelNewCategory = () => {
    setNewCategoryName('');
    setShowNewCategoryInput(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.description?.trim()) {
      showError('Please enter a description');
      return;
    }
    
    try {
      // Format the data for the database
      const expenseData = {
        id: expense.id,
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        category: formData.category,
        date: formData.date,
        wallet_id: formData.wallet_id,
        notes: formData.notes?.trim() || '',
        tags: formData.tags,
        is_income: Boolean(formData.is_income),
        photo_url: formData.photoUrl || null
      };
      
      console.log('Submitting expense data:', expenseData);
      
      // Call onSave with the formatted data
      if (typeof onSave === 'function') {
        await onSave(expenseData);
      } else {
        throw new Error('No save function provided');
      }
      
      // Close modal after saving
      onCancel();
    } catch (error) {
      showError('There was a problem saving your expense. Please try again.');
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
  
  // Format a time string for display (convert 24h to 12h format)
  const formatTimeForDisplay = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };
  
  // Generate hours for time picker (00-23)
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  
  // Generate minutes for time picker (00-59)
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  
  // Handle time selection
  const handleTimeSelect = (hour, minute) => {
    const newTime = `${hour}:${minute}`;
    setFormData(prev => ({
      ...prev,
      time: newTime
    }));
    setActiveTimePicker(null);
  };

  const handleCategorySearchChange = (e) => {
    const query = e.target.value.toLowerCase();
    setCategorySearchQuery(query);
  };

  // Filter categories based on search query
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  // Get category color
  const getCategoryColor = (category) => {
    if (!category) return 'gray';
    return getColorName(category.color);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex justify-center items-center">
            <div className="text-indigo-400">
              <svg className="animate-spin h-8 w-8 mr-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="text-indigo-300">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-lg w-full max-w-md flex flex-col h-[80vh]">
        {/* Sticky header */}
        <div className="sticky top-0 left-0 right-0 px-6 py-4 bg-gray-800 border-b border-gray-700 z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-indigo-300">
              Edit {formData.is_income ? 'Income' : 'Expense'}
            </h2>
            <button
              type="button"
              className="text-gray-400 hover:text-white p-2 rounded-full bg-gray-700 bg-opacity-50"
              onClick={onCancel}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 pt-2 flex-1 overflow-auto">
          <div className="mb-4">
            <div className="flex bg-gray-700 rounded-md p-1">
              <button
                type="button"
                className={`flex-1 py-2 px-4 rounded ${!formData.is_income ? 'bg-indigo-600 text-white' : 'text-gray-300'}`}
                onClick={() => !formData.is_income || handleToggleType()}
              >
                Expense
              </button>
              <button
                type="button"
                className={`flex-1 py-2 px-4 rounded ${formData.is_income ? 'bg-green-600 text-white' : 'text-gray-300'}`}
                onClick={() => formData.is_income || handleToggleType()}
              >
                Income
              </button>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="description" className="block mb-2 font-medium text-gray-300">
                {formData.is_income ? 'Income' : 'Expense'} Name
              </label>
              <input
                type="text"
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="amount" className="block mb-2 font-medium text-gray-300">Amount (Rp)</label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0"
                min="0"
                step="any"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            
            {/* Date and Time fields */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="relative">
                <label htmlFor="date" className="block mb-2 font-medium text-gray-300">Date</label>
                <input
                  type="text"
                  id="date"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  placeholder="Select date"
                  readOnly
                  value={formData.date ? formatDateForDisplay(formData.date) : ''}
                  onClick={() => setActiveDatePicker('date')}
                />
                {activeDatePicker === 'date' && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 date-picker-container">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-medium text-white">Select Date</h4>
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
                          start: formData.date ? new Date(formData.date) : null,
                          end: null
                        }}
                        onChange={(range) => {
                          if (range.start) {
                            const dateString = range.start.toISOString().slice(0, 10);
                            setFormData(prev => ({
                              ...prev,
                              date: dateString
                            }));
                          }
                          setActiveDatePicker(null);
                        }}
                        onClose={() => setActiveDatePicker(null)}
                        isSingleDatePicker={true}
                        pickerLabel="Select Date"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="relative">
                <label htmlFor="time" className="block mb-2 font-medium text-gray-300">Time</label>
                <input
                  type="text"
                  id="time"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  placeholder="Select time"
                  readOnly
                  value={formData.time ? formatTimeForDisplay(formData.time) : ''}
                  onClick={() => setActiveTimePicker('time')}
                />
                {activeTimePicker === 'time' && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 time-picker-container">
                    <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-medium text-white">Select Time</h4>
                        <button
                          type="button"
                          className="text-gray-400 hover:text-white p-2 rounded-full"
                          onClick={() => setActiveTimePicker(null)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="flex justify-between p-4 bg-gray-700 rounded-lg">
                        {/* Hours */}
                        <div className="space-y-2 max-h-60 overflow-y-auto w-1/2 pr-2">
                          <p className="text-xs font-semibold text-gray-300 px-2">Hour</p>
                          <ul className="space-y-1">
                            {hours.map(hour => (
                              <li key={`hour-${hour}`}>
                                <button 
                                  type="button" 
                                  className={`w-full text-left px-2 py-1 hover:bg-indigo-600 hover:text-white rounded ${
                                    formData.time && formData.time.split(':')[0] === hour 
                                      ? 'bg-indigo-600 text-white' 
                                      : 'text-gray-300'
                                  }`}
                                  onClick={() => handleTimeSelect(hour, formData.time.split(':')[1] || '00')}
                                >
                                  {hour}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {/* Minutes */}
                        <div className="space-y-2 max-h-60 overflow-y-auto w-1/2 pl-2">
                          <p className="text-xs font-semibold text-gray-300 px-2">Minute</p>
                          <ul className="space-y-1">
                            {minutes.map(minute => (
                              <li key={`minute-${minute}`}>
                                <button 
                                  type="button" 
                                  className={`w-full text-left px-2 py-1 hover:bg-indigo-600 hover:text-white rounded ${
                                    formData.time && formData.time.split(':')[1] === minute 
                                      ? 'bg-indigo-600 text-white' 
                                      : 'text-gray-300'
                                  }`}
                                  onClick={() => handleTimeSelect(formData.time.split(':')[0] || '00', minute)}
                                >
                                  {minute}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Wallet */}
            <div className="mb-6">
              <ComboboxLabel htmlFor="wallet-select" className="block mb-2 font-medium text-gray-300">Wallet</ComboboxLabel>
              {wallets.length > 0 ? (
                <Combobox
                  id="wallet-select"
                  name="wallet"
                  options={wallets}
                  displayValue={(wallet) => wallet?.name}
                  defaultValue={wallets.find(w => w.id === formData.wallet_id)}
                  onChange={handleWalletChange}
                  aria-label="Select a wallet"
                >
                  {(wallet) => (
                    <ComboboxOption value={wallet}>
                      {wallet.name} {wallet.balance !== undefined ? `($${wallet.balance})` : ''}
                    </ComboboxOption>
                  )}
                </Combobox>
              ) : (
                <div className="text-gray-400 py-2">
                  No wallets available. Please add some in Wallets.
                </div>
              )}
            </div>

            {/* Category */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="category" className="font-medium text-gray-300">Category</label>
                {!showNewCategoryInput && (
                  <button
                    type="button"
                    className="text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
                    onClick={handleAddNewCategoryClick}
                  >
                    + New Category
                  </button>
                )}
              </div>
              {showNewCategoryInput ? (
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={handleNewCategoryInputChange}
                  placeholder="New category name"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              ) : (
                <div className="space-y-4">
                  <div className="relative mb-4">
                    <input
                      type="text"
                      value={categorySearchQuery}
                      onChange={handleCategorySearchChange}
                      placeholder="Search categories..."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  {categories.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {filteredCategories.map((category) => (
                        <Badge
                          key={category.id}
                          color={getCategoryColor(category)}
                          className={selectedCategory?.id === category.id ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-indigo-500' : ''}
                          onClick={() => handleCategoryChange(category)}
                        >
                          {category.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-400 py-2">
                      No categories available. Please add some in Settings.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mb-6">
              <TagSelectorWithLabel
                selectedTags={formData.tags.map(tagId => {
                  const tag = tags.find(t => t.id === tagId);
                  return tag || tagId;
                })}
                availableTags={tags}
                onChange={handleTagsChange}
                id="tags"
                dbInitialized={dbInitialized}
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="notes" className="block mb-2 font-medium text-gray-300">Notes (optional)</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Add any additional details..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
              />
            </div>
            
            <div className="mb-6">
              <label className="block mb-2 font-medium text-gray-300">Photo (optional)</label>
              <div className="flex gap-2 mb-2">
                <button 
                  type="button"
                  onClick={takePicture}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                  {previewUrl ? 'Change Photo' : 'Take Photo'}
                </button>
                {previewUrl && (
                  <button 
                    type="button"
                    onClick={removePhoto}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
              
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="camera"
                className="hidden"
                onChange={handlePhotoChange}
              />
              
              {previewUrl && (
                <div className="mt-2 relative">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="max-h-48 rounded-md border border-gray-600" 
                  />
                </div>
              )}
            </div>
            <div className="pb-20">
              {/* Extra space at the bottom to ensure content isn't hidden behind the sticky footer */}
            </div>
          </form>
        </div>
        
        {/* Sticky footer */}
        <div className="sticky bottom-0 left-0 right-0 px-6 py-4 bg-gray-800 border-t border-gray-700 shadow-lg">
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                showConfirm(
                  'Are you sure you want to delete this transaction? This action cannot be undone.',
                  () => {
                    onDelete && onDelete(formData.id);
                    onCancel && onCancel();
                  },
                  'Delete Transaction'
                );
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-300"
            >
              Delete
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className={`px-4 py-2 text-white rounded-md transition-colors duration-300 ${
                  formData.is_income 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
                disabled={categories.length === 0}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
      
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
}

export default ExpenseEditModal; 