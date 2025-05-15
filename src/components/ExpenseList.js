import React, { useState, useEffect } from 'react';
import ExpenseEditModal from './ExpenseEditModal';
import Badge from './Badge';
import { tagDB, categoryDB } from '../utils/db';
import { getColorName } from '../utils/colors';

function ExpenseList({ expenses, deleteExpense, updateExpense, dbInitialized = false }) {
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tags, setTags] = useState([]);
  const [categories, setCategories] = useState([
    { id: 'food', name: 'Food' },
    { id: 'transportation', name: 'Transportation' },
    { id: 'entertainment', name: 'Entertainment' },
    { id: 'utilities', name: 'Utilities' },
    { id: 'housing', name: 'Housing' },
    { id: 'healthcare', name: 'Healthcare' },
    { id: 'other', name: 'Other' }
  ]);

  // Load all tags and categories
  useEffect(() => {
    const loadData = async () => {
      try {
        if (dbInitialized) {
          // Load tags from IndexedDB
          const tagsData = await tagDB.getAll();
          setTags(tagsData);
          
          // Load categories from IndexedDB
          const categoriesData = await categoryDB.getAll();
          if (categoriesData.length > 0) {
            setCategories(categoriesData);
          }
        } else {
          // Fallback to localStorage
          const savedTags = localStorage.getItem('expense-tags');
          if (savedTags) {
            setTags(JSON.parse(savedTags));
          }
          
          const savedCategories = localStorage.getItem('expense-categories');
          if (savedCategories) {
            setCategories(JSON.parse(savedCategories));
          }
        }
      } catch (error) {
        console.error('Error loading tags and categories:', error);
      }
    };
    
    loadData();
  }, [dbInitialized]);

  if (expenses.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 text-center">
          <p className="text-gray-400">No expenses added yet. Start adding some!</p>
        </div>
      </div>
    );
  }

  // Format rupiah
  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID').format(number);
  };

  const handleExpenseClick = (expense) => {
    setSelectedExpense(expense);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedExpense(null);
  };

  const handleEditExpense = (updatedExpense) => {
    updateExpense(updatedExpense);
    setIsModalOpen(false);
    setSelectedExpense(null);
  };

  // Get the display category name and color
  const formatCategory = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : categoryId;
  };

  // Get color for tag
  const getTagColor = (tagId) => {
    const tag = tags.find(t => t.id === tagId);
    return tag ? tag.color : 'gray';
  };

  // Format the tag name
  const formatTagName = (tagIdOrObject) => {
    // If it's already an object with a name property, return the name
    if (typeof tagIdOrObject === 'object' && tagIdOrObject !== null && tagIdOrObject.name) {
      return tagIdOrObject.name;
    }
    
    // Otherwise, look up the tag by ID
    const tagId = tagIdOrObject;
    const tag = tags.find(t => t.id === tagId);
    return tag ? tag.name : tagId;
  };

  // Function to truncate text
  const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
      <h2 className="text-xl font-semibold mb-4 text-indigo-300">Transaction History</h2>
      <div className="space-y-4">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className={`p-4 rounded-lg cursor-pointer transition-transform hover:scale-[1.01] hover:shadow-md ${
              expense.isIncome ? 'bg-gray-700/80 border-l-4 border-green-500' : 'bg-gray-700/80 border-l-4 border-red-500'
            }`}
            onClick={() => handleExpenseClick(expense)}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-medium text-white">{expense.name}</div>
                <div className="text-sm text-gray-400 mt-1">
                  {formatCategory(expense.category)}
                </div>
              </div>
              <div className={`font-medium mr-3 ${expense.isIncome ? 'text-green-400' : 'text-red-400'}`}>
                {expense.isIncome ? '+' : '-'} Rp {formatRupiah(expense.amount)}
              </div>
            </div>
            
            {/* Notes preview (if available) */}
            {expense.notes && (
              <div className="text-sm text-gray-400 mt-2 bg-gray-800/50 p-2 rounded">
                <span className="font-medium text-xs text-gray-500 block mb-1">Notes:</span>
                {truncateText(expense.notes)}
              </div>
            )}
            
            {/* Photo preview (if available) */}
            {expense.photoUrl && (
              <div className="mt-2">
                <img 
                  src={expense.photoUrl} 
                  alt="Receipt" 
                  className="h-16 rounded border border-gray-600 object-cover" 
                />
              </div>
            )}
            
            <div className="flex justify-between items-center mt-3">
              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {expense.tags && expense.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {expense.tags.map((tagIdOrObject) => {
                      const tagId = typeof tagIdOrObject === 'object' ? tagIdOrObject.id : tagIdOrObject;
                      return (
                        <Badge 
                          key={`${expense.id}-${tagId}`} 
                          color={getTagColor(tagId)}
                        >
                          {formatTagName(tagIdOrObject)}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {/* Date and Delete button */}
              <div className="flex items-center">
                <div className="text-xs text-gray-500 mr-3">
                  {new Date(expense.date).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Edit modal */}
      {isModalOpen && selectedExpense && (
        <ExpenseEditModal
          expense={selectedExpense}
          onSave={handleEditExpense}
          onCancel={handleCloseModal}
          onDelete={deleteExpense}
          dbInitialized={dbInitialized}
        />
      )}
    </div>
  );
}

export default ExpenseList; 