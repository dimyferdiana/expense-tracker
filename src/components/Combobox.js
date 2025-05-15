import React, { useState, useRef, useEffect } from 'react';

export function Combobox({ name, options, displayValue, value, onChange, defaultValue, 'aria-label': ariaLabel, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedValue, setSelectedValue] = useState(defaultValue || value || null);
  const comboboxRef = useRef(null);

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

  // Handle option selection
  const handleSelect = (option) => {
    setSelectedValue(option);
    setIsOpen(false);
    if (onChange) {
      onChange({ target: { name, value: option } });
    }
  };

  return (
    <div className="relative" ref={comboboxRef}>
      <button
        type="button"
        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={ariaLabel}
      >
        <span>{selectedValue ? displayValue(selectedValue) : 'Select an option'}</span>
        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-gray-800 rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-2">
            <input
              type="text"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <ul className="py-1" role="listbox">
            {filteredOptions?.map((option, index) => (
              <li
                key={index}
                role="option"
                className="px-4 py-2 hover:bg-gray-700 cursor-pointer text-gray-200"
                onClick={() => handleSelect(option)}
                aria-selected={selectedValue === option}
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

export function ComboboxLabel({ children }) {
  return <span className="block">{children}</span>;
}

export function ComboboxOption({ value, children }) {
  return children;
} 