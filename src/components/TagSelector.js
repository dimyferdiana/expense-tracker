import React, { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import Badge from './Badge';
import { tagDB as supabaseTagDB } from '../utils/supabase-db';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotification';

const TagSelector = forwardRef(({ selectedTags = [], availableTags = [], onChange, dbInitialized = false, id }, ref) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddTagModalOpen, setIsAddTagModalOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [temporaryTags, setTemporaryTags] = useState([]);
  const { showWarning } = useNotification();
  
  // Expose functions to parent component
  useImperativeHandle(ref, () => ({
    openAddTagModal: () => setIsAddTagModalOpen(true),
    getTemporaryTags: () => temporaryTags
  }));
  
  // Filter tags based on search term
  const filteredTags = [...availableTags, ...temporaryTags]
    .filter(tag => tag.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(tag => !selectedTags.some(tagId => 
      typeof tagId === 'object' ? tagId.id === tag.id : tagId === tag.id
    ));

  // Handle tag selection
  const handleTagSelect = (tagId) => {
    const newSelectedTags = [...selectedTags, tagId];
    onChange(newSelectedTags);
    setSearchTerm('');
  };

  // Handle tag removal
  const handleTagRemove = (tagId) => {
    const newSelectedTags = selectedTags.filter(id => {
      if (typeof id === 'object') {
        return id.id !== tagId;
      }
      return id !== tagId;
    });
    onChange(newSelectedTags);
  };

  // Get tag object by id
  const getTagById = (tagIdOrObject) => {
    // If it's already an object with name, return it
    if (typeof tagIdOrObject === 'object' && tagIdOrObject !== null && tagIdOrObject.name) {
      return tagIdOrObject;
    }
    
    // Otherwise look up the tag
    const tagId = tagIdOrObject;
    const allTags = [...availableTags, ...temporaryTags];
    const foundTag = allTags.find(tag => tag.id === tagId);
    
    // If we can't find the tag, return a basic object to avoid null rendering issues
    return foundTag || { id: tagId, name: tagId };
  };

  // Color assignments for tags - distribute evenly across available colors
  const tagColors = [
    'blue', 'green', 'yellow', 'indigo', 'purple', 
    'pink', 'lime', 'rose', 'teal', 'cyan', 'orange'
  ];

  const getTagColor = (tag, index) => {
    return tag.color || tagColors[index % tagColors.length];
  };

  // Handle adding a new tag
  const handleAddNewTag = async () => {
    if (!newTagName.trim()) return;
    
    // Generate a proper ID based on the tag name
    const tagId = newTagName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    // Check if tag already exists
    const allTags = [...availableTags, ...temporaryTags];
    const existingTag = allTags.find(t => t.id === tagId || t.name.toLowerCase() === newTagName.trim().toLowerCase());
    
    if (existingTag) {
      // Use existing tag instead of creating duplicate
      handleTagSelect(existingTag);
      setNewTagName('');
      setIsAddTagModalOpen(false);
      return;
    }
    
    // Generate a random color
    const colors = [
      'blue', 'green', 'yellow', 'indigo', 'purple', 
      'pink', 'lime', 'rose', 'teal', 'cyan', 'orange'
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Create new tag object
    const newTag = { 
      id: tagId, 
      name: newTagName.trim(),
      color: randomColor
    };
    
    try {
      // Save tag to database if possible
      if (dbInitialized && user) {
        // Add new tag to database
        await supabaseTagDB.add(newTag, user.id);
        
        // The tag should now be available in the availableTags list
        // We don't need to add it to temporaryTags since it's saved to DB
        handleTagSelect(newTag);
      } else {
        // Add to temporary tags and localStorage
        setTemporaryTags(prev => [...prev, newTag]);
        
        // Save to localStorage as fallback
        try {
          const savedTags = JSON.parse(localStorage.getItem('expense-tags') || '[]');
          if (!savedTags.some(t => t.id === tagId || t.name.toLowerCase() === newTagName.trim().toLowerCase())) {
            savedTags.push(newTag);
            localStorage.setItem('expense-tags', JSON.stringify(savedTags));
          }
        } catch (e) {
          console.error("Error saving tag to localStorage:", e);
        }
        
        // Add to selected tags
        handleTagSelect(newTag);
      }
    } catch (error) {
      console.error("Error saving tag to database:", error);
      
      // Fall back to temporary tags
      setTemporaryTags(prev => [...prev, newTag]);
      handleTagSelect(newTag);
      showWarning(`Tag saved locally only: ${error.message}`);
    }
    
    // Reset form
    setNewTagName('');
    setIsAddTagModalOpen(false);
  };

  // Handle Enter key press in the new tag input
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddNewTag();
    }
  };

  return (
    <div className="space-y-4">
      {/* Selected Tags Section */}
      {selectedTags.length > 0 && (
        <div className="p-4 flex flex-wrap gap-2 mb-4 border-b border-gray-700">
          {selectedTags.map((tagIdOrObject, index) => {
            const tag = getTagById(tagIdOrObject);
            return tag ? (
              <Badge 
                key={typeof tagIdOrObject === 'object' ? tagIdOrObject.id : tagIdOrObject} 
                color={getTagColor(tag, index)} 
                removable={true}
                onRemove={() => handleTagRemove(typeof tagIdOrObject === 'object' ? tagIdOrObject.id : tagIdOrObject)}
              >
                {tag.name}
              </Badge>
            ) : null;
          })}
        </div>
      )}

      {/* Search Box */}
      <div className="relative mb-4">
        <input
          id={id}
          type="text"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Search tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search tags"
        />
      </div>
      
      {/* Available Tags */}
      <div className="flex flex-wrap gap-2">
        {filteredTags.length === 0 ? (
          <p className="text-gray-400 text-sm">No matching tags found</p>
        ) : (
          filteredTags.map((tag, index) => (
            <Badge 
              key={tag.id}
              color={getTagColor(tag, index)}
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handleTagSelect(tag)}
            >
              {tag.name}
            </Badge>
          ))
        )}
      </div>

      {/* Add New Tag Modal */}
      {isAddTagModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-white mb-4">Add New Tag</h3>
            <div className="mb-4">
              <input
                type="text"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Tag name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-300"
                onClick={() => {
                  setNewTagName('');
                  setIsAddTagModalOpen(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-300"
                onClick={handleAddNewTag}
                disabled={!newTagName.trim()}
              >
                Add Tag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export function TagSelectorWithLabel({ selectedTags, availableTags, onChange, id = "tags", dbInitialized = false }) {
  const tagSelectorRef = React.useRef();
  
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <label htmlFor={id} className="font-medium text-gray-300">Tags</label>
        <button
          type="button"
          className="text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
          onClick={() => tagSelectorRef.current?.openAddTagModal()}
        >
          + Add New Tag
        </button>
      </div>
      <TagSelector 
        ref={tagSelectorRef}
        selectedTags={selectedTags}
        availableTags={availableTags}
        onChange={onChange}
        dbInitialized={dbInitialized}
        id={id}
      />
    </div>
  );
}

export default TagSelector; 