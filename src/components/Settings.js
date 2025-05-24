import React, { useState, useEffect } from 'react';
import { 
  categoryDB as supabaseCategoryDB, 
  tagDB as supabaseTagDB 
} from '../utils/supabase-db';
import Badge from './Badge';
import { colorClasses, getColorClasses, getColorName, availableColors } from '../utils/colors';
import { useAuth } from '../contexts/AuthContext';

function CategoryModal({ open, onClose, onSave, category = null }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('blue');
  const [error, setError] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      if (category) {
        setName(category.name);
        setColor(getColorName(category.color) || 'blue');
      } else {
        setName('');
        setColor('blue');
      }
      setError('');
    }
  }, [open, category]);

  const handleSave = () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    
    onSave({ 
      name: name.trim(), 
      color: getColorClasses(color)
    });
    setError('');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-white mb-4">
          {category ? 'Edit Category' : 'Add New Category'}
        </h3>
        {error && (
          <div className="mb-4 text-sm text-red-500">
            {error}
          </div>
        )}
        <div className="mb-4">
          <label className="block mb-2 font-medium text-gray-300">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Category name"
            autoFocus
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2 font-medium text-gray-300">Preview</label>
          <div className="mb-4">
            <Badge color={color}>{name || 'Category Preview'}</Badge>
          </div>
        </div>
        <div className="mb-6">
          <label className="block mb-2 font-medium text-gray-300">Color</label>
          <div className="grid grid-cols-6 gap-2">
            {availableColors.map(colorName => (
              <button
                key={colorName}
                className={`w-8 h-8 rounded-full ${getColorClasses(colorName)} ${
                  color === colorName ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-white' : ''
                }`}
                onClick={() => setColor(colorName)}
              />
            ))}
          </div>
        </div>
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
            {category ? 'Save Changes' : 'Add Category'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TagModal({ open, onClose, onSave, tag = null }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('blue');
  const [error, setError] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      if (tag) {
        setName(tag.name);
        setColor(tag.color || 'blue');
      } else {
        setName('');
        setColor('blue');
      }
      setError('');
    }
  }, [open, tag]);

  const handleSave = () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    
    onSave({ 
      name: name.trim(), 
      color: color
    });
    setError('');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-white mb-4">
          {tag ? 'Edit Tag' : 'Add New Tag'}
        </h3>
        {error && (
          <div className="mb-4 text-sm text-red-500">
            {error}
          </div>
        )}
        <div className="mb-4">
          <label className="block mb-2 font-medium text-gray-300">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Tag name"
            autoFocus
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2 font-medium text-gray-300">Preview</label>
          <div className="mb-4">
            <Badge color={color}>{name || 'Tag Preview'}</Badge>
          </div>
        </div>
        <div className="mb-6">
          <label className="block mb-2 font-medium text-gray-300">Color</label>
          <div className="grid grid-cols-6 gap-2">
            {availableColors.map(colorName => (
              <button
                key={colorName}
                className={`w-8 h-8 rounded-full ${getColorClasses(colorName)} ${
                  color === colorName ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-white' : ''
                }`}
                onClick={() => setColor(colorName)}
              />
            ))}
          </div>
        </div>
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
            {tag ? 'Save Changes' : 'Add Tag'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Settings({ dbInitialized = false }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingTag, setEditingTag] = useState(null);

  // Load categories and tags
  const loadData = async () => {
    try {
      if (dbInitialized && user) {
        // Load categories from Supabase
        const categoryData = await supabaseCategoryDB.getAll(user.id);
        setCategories(categoryData);
        // Load tags from Supabase
        const tagData = await supabaseTagDB.getAll(user.id);
        setTags(tagData);
      } else {
        // Fallback to localStorage
        loadFromLocalStorage();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      loadFromLocalStorage();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dbInitialized, user]);

  // Load from localStorage if needed
  const loadFromLocalStorage = () => {
    // Load categories
    const savedCategories = localStorage.getItem('expense-categories');
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    } else {
      // Default categories with colors
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
      localStorage.setItem('expense-categories', JSON.stringify(defaultCategories));
    }

    // Load tags
    const savedTags = localStorage.getItem('expense-tags');
    if (savedTags) {
      setTags(JSON.parse(savedTags));
    } else {
      // Default tags with colors
      const defaultTags = [
        { id: 'essential', name: 'Essential', color: 'blue' },
        { id: 'recurring', name: 'Recurring', color: 'green' },
        { id: 'emergency', name: 'Emergency', color: 'red' },
        { id: 'personal', name: 'Personal', color: 'purple' },
        { id: 'work', name: 'Work', color: 'indigo' }
      ];
      setTags(defaultTags);
      localStorage.setItem('expense-tags', JSON.stringify(defaultTags));
    }
  };

  // Save categories to localStorage (if not using IndexedDB)
  useEffect(() => {
    if (!dbInitialized && categories.length > 0) {
      localStorage.setItem('expense-categories', JSON.stringify(categories));
    }
  }, [categories, dbInitialized]);

  // Save tags to localStorage (if not using IndexedDB)
  useEffect(() => {
    if (!dbInitialized && tags.length > 0) {
      localStorage.setItem('expense-tags', JSON.stringify(tags));
    }
  }, [tags, dbInitialized]);

  // Handle saving a category
  const handleCategorySave = async (category) => {
    try {
      if (editingCategory) {
        // When editing, make sure to include the id
        await supabaseCategoryDB.update({
          ...category,
          id: editingCategory.id // Include the id from the editingCategory
        }, user.id);
      } else {
        await supabaseCategoryDB.add(category, user.id);
      }
      await loadData();
      setShowCategoryModal(false);
      setEditingCategory(null);
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category. Please try again.');
    }
  };
  
  // Handle saving a tag
  const handleTagSave = async (tag) => {
    try {
      if (editingTag) {
        // When editing, make sure to include the id
        await supabaseTagDB.update({
          ...tag,
          id: editingTag.id // Include the id from the editingTag
        }, user.id);
      } else {
        await supabaseTagDB.add(tag, user.id);
      }
      await loadData();
      setShowTagModal(false);
      setEditingTag(null);
    } catch (error) {
      console.error('Error saving tag:', error);
      alert('Failed to save tag. Please try again.');
    }
  };
  
  // Handle deleting a category
  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    
    try {
      if (dbInitialized && user) {
        await supabaseCategoryDB.delete(id, user.id);
        const updatedCategories = await supabaseCategoryDB.getAll(user.id);
        setCategories(updatedCategories);
      } else {
        const updatedCategories = categories.filter(c => c.id !== id);
        setCategories(updatedCategories);
        localStorage.setItem('expense-categories', JSON.stringify(updatedCategories));
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      setError('Failed to delete category. Please try again.');
    }
  };
  
  // Handle deleting a tag
  const handleDeleteTag = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tag?')) return;
    
    try {
      if (dbInitialized && user) {
        await supabaseTagDB.delete(id, user.id);
        const updatedTags = await supabaseTagDB.getAll(user.id);
        setTags(updatedTags);
      } else {
        const updatedTags = tags.filter(t => t.id !== id);
        setTags(updatedTags);
        localStorage.setItem('expense-tags', JSON.stringify(updatedTags));
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
      setError('Failed to delete tag. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-indigo-400">
          <svg className="animate-spin h-8 w-8 mr-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p className="text-indigo-300">Loading...</p>
      </div>
    );
  }

  return (
    <div className="pb-20 mb-16">
      <h2 className="text-xl font-semibold mb-6 text-indigo-300">Settings</h2>
      
      {/* Storage indicator */}
      <div className="mb-4 text-sm">
        <span className="inline-flex items-center text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
          </svg>
          Storage: {dbInitialized ? 'Supabase' : 'LocalStorage'}
        </span>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700 mb-6">
        <button
          className={`py-2 px-4 font-medium ${activeTab === 'categories' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-gray-300'}`}
          onClick={() => setActiveTab('categories')}
        >
          Categories
        </button>
        <button
          className={`py-2 px-4 font-medium ${activeTab === 'tags' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-gray-300'}`}
          onClick={() => setActiveTab('tags')}
        >
          Tags
        </button>
      </div>
      
      {error && (
        <div className="bg-red-900 text-white p-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">Categories</h3>
            <button
              onClick={() => {
                setEditingCategory(null);
                setShowCategoryModal(true);
              }}
              className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors duration-300"
            >
              Add Category
            </button>
          </div>
          
          <div className="p-4 flex flex-wrap gap-2 mb-4 border-b border-gray-700">
            {categories.map((category) => (
              <Badge key={category.id} color={getColorName(category.color)}>
                {category.name}
              </Badge>
            ))}
          </div>
          
          {categories.length === 0 ? (
            <div className="p-4 text-gray-400">No categories defined.</div>
          ) : (
            <ul>
              {categories.map(category => (
                <li key={category.id} className="border-b border-gray-700 last:border-b-0">
                  <div className="flex justify-between items-center p-4">
                    <div>
                      <div className="text-white font-medium">{category.name}</div>
                      <div className="text-gray-400 text-sm">ID: {category.id}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingCategory(category);
                          setShowCategoryModal(true);
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Tags Tab */}
      {activeTab === 'tags' && (
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">Tags</h3>
            <button
              onClick={() => {
                setEditingTag(null);
                setShowTagModal(true);
              }}
              className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors duration-300"
            >
              Add Tag
            </button>
          </div>
          
          <div className="p-4 flex flex-wrap gap-2 mb-4 border-b border-gray-700">
            {tags.map((tag) => (
              <Badge key={tag.id} color={tag.color}>
                {tag.name}
              </Badge>
            ))}
          </div>
          
          {tags.length === 0 ? (
            <div className="p-4 text-gray-400">No tags defined.</div>
          ) : (
            <ul>
              {tags.map(tag => (
                <li key={tag.id} className="border-b border-gray-700 last:border-b-0">
                  <div className="flex justify-between items-center p-4">
                    <div>
                      <div className="text-white font-medium">{tag.name}</div>
                      <div className="text-gray-400 text-sm">ID: {tag.id}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingTag(tag);
                          setShowTagModal(true);
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Modals */}
      <CategoryModal
        open={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          setEditingCategory(null);
        }}
        onSave={handleCategorySave}
        category={editingCategory}
      />

      <TagModal
        open={showTagModal}
        onClose={() => {
          setShowTagModal(false);
          setEditingTag(null);
        }}
        onSave={handleTagSave}
        tag={editingTag}
      />
    </div>
  );
}

export default Settings; 