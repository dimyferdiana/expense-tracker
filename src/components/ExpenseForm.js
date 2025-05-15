import React, { useState, useEffect, useRef } from 'react';
import { Combobox, ComboboxLabel, ComboboxOption } from './Combobox';
import TagSelector, { TagSelectorWithLabel } from './TagSelector';
import { categoryDB, tagDB, walletDB } from '../utils/db';
import DateRangePicker from './DateRangePicker';
import Badge from './Badge';
import { getColorName } from '../utils/colors';

function CategoryModal({ open, onClose, onSave }) {
  const [input, setInput] = useState('');

  const handleSave = () => {
    if (input.trim()) {
      onSave(input.trim());
      setInput('');
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Add New Category</h3>
        <input
          type="text"
          className="w-full px-3 py-2 mb-4 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Category name"
          value={input}
          onChange={e => setInput(e.target.value)}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ExpenseForm({ addExpense, dbInitialized = false, onClose }) {
  // Get current date and time for default values
  const now = new Date();
  const currentDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: 'food',
    tags: [],
    walletId: 'cash',
    isIncome: false,
    notes: '',
    photoUrl: '',
    date: currentDate,
    time: currentTime
  });
  
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  // Add state for date picker
  const [activeDatePicker, setActiveDatePicker] = useState(null); // 'date' or null
  
  // Add state for time picker
  const [activeTimePicker, setActiveTimePicker] = useState(null); // 'time' or null
  
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

  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Load categories and tags
  useEffect(() => {
    const loadData = async () => {
      try {
        if (dbInitialized) {
          // Load categories from IndexedDB
          const categoryData = await categoryDB.getAll();
          if (categoryData.length > 0) {
            setCategories(categoryData);
            
            // Set default category if it exists in the loaded categories
            const defaultCategory = categoryData.find(cat => cat.id === 'food') || categoryData[0];
            if (defaultCategory) {
              setFormData(prev => ({ ...prev, category: defaultCategory.id }));
            }
          }

          // Load tags from IndexedDB
          const tagData = await tagDB.getAll();
          if (tagData.length > 0) {
            setTags(tagData);
          }

          // Load wallets from IndexedDB
          const walletData = await walletDB.getAll();
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
  }, [dbInitialized]);

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

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file type is image
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    // Check file size is less than 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert('File size should be less than 5MB');
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

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setFormData({ ...formData, category: category.id });
    setCategorySearchQuery(''); // Clear search when selecting
  };

  const handleCategorySearchChange = (e) => {
    setCategorySearchQuery(e.target.value);
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  const handleTagsChange = (selectedTags) => {
    setFormData(prev => ({
      ...prev,
      tags: selectedTags
    }));
  };

  const handleWalletChange = (e) => {
    setFormData({ ...formData, walletId: e.target.value.id });
  };

  const handleAddNewCategoryClick = () => {
    setShowCategoryModal(true);
  };

  const handleCloseCategoryModal = () => {
    setShowCategoryModal(false);
  };

  const handleSaveCategory = async (name) => {
    // Generate a random color from the available colors
    const colors = [
      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
      'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300',
      'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300',
      'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
      'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
      'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newCategory = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      color: randomColor
    };
    try {
      if (dbInitialized) {
        await categoryDB.add(newCategory);
      } else {
        const updatedCategories = [...categories, newCategory];
        setCategories(updatedCategories);
        localStorage.setItem('expense-categories', JSON.stringify(updatedCategories));
      }
      setCategories(prev => [...prev, newCategory]);
      setFormData(prev => ({ ...prev, category: newCategory.id }));
      setSelectedCategory(newCategory);
      setShowCategoryModal(false);
    } catch (error) {
      alert('Failed to add new category.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim() || !formData.amount || isNaN(formData.amount)) {
      alert('Please enter valid name and amount');
      return;
    }

    // Determine the final category to use (user could have created a new one)
    let finalCategory = formData.category;
    
    // If a new category name is entered, add it before saving the transaction
    if (showNewCategoryInput && newCategoryName.trim()) {
      const newCategory = {
        id: newCategoryName.trim().toLowerCase().replace(/\s+/g, '-'), // Simple ID generation
        name: newCategoryName.trim(),
      };

      try {
        if (dbInitialized) {
          await categoryDB.add(newCategory);
        } else {
          // Fallback to localStorage
          const updatedCategories = [...categories, newCategory];
          setCategories(updatedCategories);
          localStorage.setItem('expense-categories', JSON.stringify(updatedCategories));
        }
        // Update the categories state in the form
        setCategories(prev => [...prev, newCategory]);
        // Use the new category's id for the current transaction
        finalCategory = newCategory.id;

        // Reset new category states after saving
        setNewCategoryName('');
        setShowNewCategoryInput(false);

      } catch (error) {
        console.error('Error adding new category on submit:', error);
        alert('Failed to add new category. Transaction not saved.');
        return; // Stop submission if new category fails to save
      }
    }
    
    // Ensure all tags are saved to the database
    let processedTags = [...formData.tags]; // Copy the tags array
    
    if (dbInitialized) {
      try {
        // Check if all tags exist in the database, save any that don't
        const allTags = await tagDB.getAll();
        
        // Process each tag to ensure it's saved to the database
        for (let i = 0; i < processedTags.length; i++) {
          const tag = processedTags[i];
          
          // If it's an object with a name property, it might be a temporary tag
          if (typeof tag === 'object' && tag !== null && tag.name) {
            // Check if this tag already exists in the database
            const existingTag = allTags.find(t => 
              t.id === tag.id || 
              t.name.toLowerCase() === tag.name.toLowerCase()
            );
            
            if (existingTag) {
              // Use the existing tag instead
              processedTags[i] = existingTag.id;
            } else {
              // Tag doesn't exist, add it to the database
              try {
                await tagDB.add(tag);
                // Replace object reference with just the ID
                processedTags[i] = tag.id;
              } catch (tagError) {
                console.error("Error saving tag:", tagError);
                // Keep as is if we can't save
              }
            }
          }
        }
      } catch (error) {
        console.error("Error processing tags:", error);
        // Proceed with original tags if there's an error
      }
    }
    
    // Format the expense object
    const expenseData = {
      name: formData.name.trim(),
      amount: parseFloat(formData.amount),
      category: finalCategory,
      tags: processedTags, // Use the processed tags
      walletId: formData.walletId,
      isIncome: formData.isIncome,
      notes: formData.notes ? formData.notes.trim() : '',
      photoUrl: formData.photoUrl,
      date: formData.date, // Keep original date format for saving
      time: formData.time  // Keep original time format for saving
    };
    
    try {
      addExpense(expenseData);
      
      // Reset form (except category and wallet for convenience)
      setFormData({
        name: '',
        amount: '',
        category: finalCategory, // Keep the potentially new category for convenience
        tags: [],
        walletId: formData.walletId, // Keep the same wallet for convenience
        isIncome: false,
        notes: '',
        photoUrl: '',
        date: currentDate,
        time: currentTime
      });
      setPreviewUrl('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (submitError) {
      console.error("Error adding expense:", submitError);
      alert("There was a problem saving your expense. Please try again.");
    }
  };

  // Helper function to get category color based on category ID
  const getCategoryColor = (category) => {
    if (!category) return 'gray';
    return getColorName(category.color);
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

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header */}
      <div className="sticky top-0 left-0 right-0 px-6 py-4 bg-gray-800 border-b border-gray-700 z-10">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-indigo-300">
            Add New {formData.isIncome ? 'Income' : 'Expense'}
          </h2>
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
          <div className="mb-6">
            <label htmlFor="name" className="block mb-2 font-medium text-gray-300">
              {formData.isIncome ? 'Income' : 'Expense'} Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={formData.isIncome ? "e.g., Salary" : "e.g., Groceries"}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              autoFocus
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
              step="1000"
              min="1000"
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
            <label htmlFor="wallet" className="block mb-2 font-medium text-gray-300">Wallet</label>
            {wallets.length > 0 ? (
              <Combobox
                name="wallet"
                options={wallets}
                displayValue={(wallet) => wallet?.name}
                defaultValue={wallets.find(w => w.id === formData.walletId)}
                onChange={handleWalletChange}
                aria-label="Wallet"
              >
                {(wallet) => (
                  <ComboboxOption value={wallet}>
                    <ComboboxLabel>{wallet.name}</ComboboxLabel>
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
                onChange={handleChange}
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
              selectedTags={formData.tags}
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
                Take Photo
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
            {/* Extra space at bottom for sticky footer */}
          </div>
        </form>
      </div>
      
      {/* Sticky footer */}
      <div className="sticky bottom-0 left-0 right-0 px-6 py-4 bg-gray-800 border-t border-gray-700 shadow-lg">
        <div className="flex justify-end">
          <button 
            type="button"
            onClick={handleSubmit}
            className={`px-6 py-2 text-white rounded-md transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
              formData.isIncome 
                ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            }`}
          >
            {formData.isIncome ? 'Add Income' : 'Add Expense'}
          </button>
        </div>
      </div>

      <CategoryModal
        open={showCategoryModal}
        onClose={handleCloseCategoryModal}
        onSave={handleSaveCategory}
      />
    </div>
  );
}

export default ExpenseForm; 