import React, { useState, useRef, useEffect } from 'react';

export function Combobox({ name, options, displayValue, value, onChange, defaultValue, 'aria-label': ariaLabel, id, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedValue, setSelectedValue] = useState(defaultValue || value || null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const comboboxRef = useRef(null);
  const listboxRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options?.filter(option => 
    displayValue(option).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[focusedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      case 'Tab':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  // Handle option selection
  const handleSelect = (option) => {
    setSelectedValue(option);
    setIsOpen(false);
    setFocusedIndex(-1);
    if (onChange) {
      onChange({ target: { name, value: option } });
    }
  };

  // Scroll focused option into view
  useEffect(() => {
    if (focusedIndex >= 0 && listboxRef.current) {
      const options = listboxRef.current.getElementsByTagName('li');
      if (options[focusedIndex]) {
        options[focusedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  return (
    <div className="relative" ref={comboboxRef}>
      <button
        type="button"
        id={id}
        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={ariaLabel}
        aria-controls={`${id}-listbox`}
        onKeyDown={handleKeyDown}
        role="combobox"
      >
        <span>{selectedValue ? displayValue(selectedValue) : 'Select an option'}</span>
        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute z-10 mt-1 w-full bg-gray-800 rounded-md shadow-lg max-h-60 overflow-auto"
          role="presentation"
        >
          <div className="p-2">
            <input
              type="text"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              aria-label="Search options"
            />
          </div>
          <ul 
            id={`${id}-listbox`}
            className="py-1" 
            role="listbox"
            ref={listboxRef}
            aria-label={ariaLabel}
          >
            {filteredOptions?.map((option, index) => (
              <li
                key={index}
                role="option"
                className={`px-4 py-2 hover:bg-gray-700 cursor-pointer text-gray-200 ${
                  focusedIndex === index ? 'bg-gray-700' : ''
                }`}
                onClick={() => handleSelect(option)}
                aria-selected={selectedValue === option}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                {children ? children(option) : displayValue(option)}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Hidden input to store the actual value for form submission */}
      <input
        type="hidden"
        name={name}
        value={selectedValue || ''}
      />
    </div>
  );
}

export function ComboboxLabel({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="block">
      {children}
    </label>
  );
}

export function ComboboxOption({ value, children }) {
  return children;
} 