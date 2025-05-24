import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Combobox } from './Combobox';
import TagSelector from './TagSelector';
import DateRangePicker from './DateRangePicker';
import Badge from './Badge';
import { getColorName } from '../utils/colors';

function FilterSortModal({
  isOpen,
  onClose,
  onApply,
  initialFilters,
  initialSort,
  availableCategories = [],
  availableTags = [],
  availableWallets = []
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [sort, setSort] = useState(initialSort);
  
  // Multiple selection states
  const [selectedWallets, setSelectedWallets] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

  // Initialize multi-selection states
  useEffect(() => {
    if (initialFilters) {
      // Convert single wallet ID to array
      if (initialFilters.walletId && initialFilters.walletId !== 'all') {
        setSelectedWallets(Array.isArray(initialFilters.walletId) 
          ? initialFilters.walletId 
          : [initialFilters.walletId]);
      } else {
        setSelectedWallets([]);
      }
      
      // Convert single category ID to array
      if (initialFilters.categoryId && initialFilters.categoryId !== 'all') {
        setSelectedCategories(Array.isArray(initialFilters.categoryId) 
          ? initialFilters.categoryId 
          : [initialFilters.categoryId]);
      } else {
        setSelectedCategories([]);
      }
      
      // Tags are already an array
      setSelectedTags(initialFilters.tags || []);
    }
  }, [initialFilters]);

  useEffect(() => {
    setFilters(initialFilters);
    setSort(initialSort);
  }, [initialFilters, initialSort]);

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle multi-select for wallets
  const handleWalletToggle = (walletId) => {
    let newSelection;
    if (walletId === 'all') {
      // If "All Wallets" is selected, clear other selections
      newSelection = [];
      setSelectedWallets(newSelection);
    } else {
      // Toggle selection
      if (selectedWallets.includes(walletId)) {
        newSelection = selectedWallets.filter(id => id !== walletId);
      } else {
        newSelection = [...selectedWallets, walletId];
      }
      setSelectedWallets(newSelection);
    }
    
    // Update filters with the new selection or 'all' if empty
    handleFilterChange('walletId', newSelection.length > 0 ? newSelection : 'all');
  };
  
  // Handle multi-select for categories
  const handleCategoryToggle = (categoryId) => {
    let newSelection;
    if (categoryId === 'all') {
      // If "All Categories" is selected, clear other selections
      newSelection = [];
      setSelectedCategories(newSelection);
    } else {
      // Toggle selection
      if (selectedCategories.includes(categoryId)) {
        newSelection = selectedCategories.filter(id => id !== categoryId);
      } else {
        newSelection = [...selectedCategories, categoryId];
      }
      setSelectedCategories(newSelection);
    }
    
    // Update filters with the new selection or 'all' if empty
    handleFilterChange('categoryId', newSelection.length > 0 ? newSelection : 'all');
  };
  
  // Handle tag selection
  const handleTagsChange = (selectedTagIds) => {
    setSelectedTags(selectedTagIds);
    handleFilterChange('tags', selectedTagIds);
  };

  // Simplified sort options
  const sortOptions = [
    { id: 'date_desc', name: 'Newest to Oldest' },
    { id: 'date_asc', name: 'Oldest to Newest' },
    { id: 'amount_desc', name: 'Highest to Lowest Amount' },
    { id: 'amount_asc', name: 'Lowest to Highest Amount' },
  ];

  const handleSortChange = (sortOptionId) => {
    const [field, order] = sortOptionId.split('_');
    setSort({ field, order });
  };
  
  const handleApply = () => {
    onApply(filters, sort);
    onClose();
  };

  const handleResetFilters = () => {
    // Only reset filters, not sort
    setFilters({
      type: 'all',
      walletId: 'all',
      categoryId: 'all',
      tags: [],
      dateRange: 'all',
      startDate: '',
      endDate: '',
    });
    setSelectedWallets([]);
    setSelectedCategories([]);
    setSelectedTags([]);
    setActiveDatePicker(null);
  };

  // Date range options
  const dateRangeOptions = [
    { id: 'all', name: 'All Time' },
    { id: 'today', name: 'Today' },
    { id: 'thisWeek', name: 'This Week' },
    { id: 'thisMonth', name: 'This Month' },
    { id: 'custom', name: 'Custom Range' },
  ];
  
  const [activeDatePicker, setActiveDatePicker] = useState(null); // 'start', 'end', or null

  // Format a date object as YYYY-MM-DD for input fields
  const formatDateForInput = (date) => {
    if (!date) return '';
    if (typeof date === 'string') return date.slice(0, 10);
    return date.toISOString().slice(0, 10);
  };

  // Display formatted date in human-readable format
  const formatDateForDisplay = (date) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Helper to close date pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (activeDatePicker && !e.target.closest('.date-picker-container')) {
        setActiveDatePicker(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDatePicker]);

  // Get category color
  const getCategoryColor = (category) => {
    if (!category) return 'gray';
    return getColorName(category.color);
  };

  // Get tag color
  const getTagColor = (tag) => {
    return tag.color || 'gray';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg mx-4">
          {/* Sticky header */}
          <div className="sticky top-0 left-0 right-0 px-6 py-4 bg-gray-800 border-b border-gray-700 z-10">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-white">Filter & Sort</h3>
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
          
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Filter Section */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-md font-medium text-white">Filter by:</h4>
                <button
                  type="button"
                  className="text-xs px-2 py-1 text-indigo-300 hover:text-indigo-100 transition-colors"
                  onClick={handleResetFilters}
                >
                  Reset Filters
                </button>
              </div>
              
              {/* Type Filter */}
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Type</label>
                <div className="flex bg-gray-700 rounded-md p-1">
                  <button
                    type="button"
                    className={`flex-1 py-2 px-4 rounded ${
                      filters.type === 'all' ? 'bg-indigo-600 text-white' : 'text-gray-300'
                    }`}
                    onClick={() => handleFilterChange('type', 'all')}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-2 px-4 rounded ${
                      filters.type === 'expense' ? 'bg-indigo-600 text-white' : 'text-gray-300'
                    }`}
                    onClick={() => handleFilterChange('type', 'expense')}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-2 px-4 rounded ${
                      filters.type === 'income' ? 'bg-green-600 text-white' : 'text-gray-300'
                    }`}
                    onClick={() => handleFilterChange('type', 'income')}
                  >
                    Income
                  </button>
                </div>
              </div>
              
              {/* Date Range Filter */}
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Date Range</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label htmlFor="startDate" className="block mb-2 text-sm text-gray-300">Start Date</label>
                    <input
                      type="text"
                      id="startDate"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      placeholder="Select date"
                      readOnly
                      value={filters.startDate ? formatDateForDisplay(filters.startDate) : ''}
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
                              start: filters.startDate ? new Date(filters.startDate) : null,
                              end: null
                            }}
                            onChange={(range) => {
                              setFilters(prev => ({
                                ...prev,
                                startDate: range.start,
                                dateRange: 'custom',
                              }));
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
                  
                  <div className="relative">
                    <label htmlFor="endDate" className="block mb-2 text-sm text-gray-300">End Date</label>
                    <input
                      type="text"
                      id="endDate"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      placeholder="Select date"
                      readOnly
                      value={filters.endDate ? formatDateForDisplay(filters.endDate) : ''}
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
                              end: filters.endDate ? new Date(filters.endDate) : null
                            }}
                            onChange={(range) => {
                              setFilters(prev => ({
                                ...prev,
                                endDate: range.end || range.start,
                                dateRange: 'custom',
                              }));
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
                </div>
              </div>

              {/* Wallet Filter - Multiple Selection */}
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Wallet</label>
                <div className="bg-gray-700 rounded-md py-2 px-1">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium cursor-pointer hover:bg-gray-600
                        ${selectedWallets.length === 0 ? 'bg-indigo-600 text-white' : 'text-gray-300 bg-gray-800'}`}
                      onClick={() => handleWalletToggle('all')}
                    >
                      All Wallets
                    </span>
                    {availableWallets.map(wallet => (
                      <span
                        key={wallet.id}
                        className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium cursor-pointer hover:bg-gray-600
                          ${selectedWallets.includes(wallet.id) ? 'bg-indigo-600 text-white' : 'text-gray-300 bg-gray-800'}`}
                        onClick={() => handleWalletToggle(wallet.id)}
                      >
                        {wallet.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Category Filter - Multiple Selection */}
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Category</label>
                <div className="bg-gray-700 rounded-md py-2 px-1">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge
                      color="gray"
                      className={selectedCategories.length === 0 ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-indigo-500' : ''}
                      onClick={() => handleCategoryToggle('all')}
                    >
                      All Categories
                    </Badge>
                    {availableCategories.map(category => (
                      <Badge
                        key={category.id}
                        color={getCategoryColor(category)}
                        className={selectedCategories.includes(category.id) ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-indigo-500' : ''}
                        onClick={() => handleCategoryToggle(category.id)}
                      >
                        {category.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Tags Filter - Multiple Selection */}
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Tags</label>
                <div className="bg-gray-700 rounded-md py-2 px-1">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {availableTags.map(tag => (
                      <Badge
                        key={tag.id}
                        color={getTagColor(tag)}
                        className={selectedTags.includes(tag.id) ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-indigo-500' : ''}
                        onClick={() => {
                          const newTags = selectedTags.includes(tag.id)
                            ? selectedTags.filter(id => id !== tag.id)
                            : [...selectedTags, tag.id];
                          handleTagsChange(newTags);
                        }}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                  {availableTags.length === 0 && (
                    <p className="text-gray-500 text-xs px-2">No tags available</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sort Section - Dropdown */}
            <div className="mb-6">
              <label htmlFor="sort" className="block text-gray-300 mb-2">Sort by:</label>
              <Combobox
                name="sort"
                options={sortOptions}
                displayValue={(option) => option.name}
                defaultValue={sortOptions.find(opt => {
                  const [field, order] = opt.id.split('_');
                  return sort.field === field && sort.order === order;
                })}
                onChange={(event) => {
                  const option = event?.target ? event.target.value : event;
                  if (option && option.id) {
                    handleSortChange(option.id);
                  }
                }}
                aria-label="Sort Options"
              />
            </div>
          </div>

          {/* Sticky footer */}
          <div className="sticky bottom-0 left-0 right-0 px-6 py-4 bg-gray-800 border-t border-gray-700 shadow-lg">
            <button
              type="button"
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-300"
              onClick={handleApply}
            >
              Apply Filters & Sort
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default FilterSortModal; 