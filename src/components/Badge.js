import React from 'react';
import { getColorClasses } from '../utils/colors';

function Badge({ children, color = 'gray', className = '', removable, onRemove, ...props }) {
  const colorClasses = getColorClasses(color);
  
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses} ${className}`}
      {...props}
    >
      {children}
      {removable === true && (
        <button
          type="button"
          className="ml-1.5 -mr-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-500 focus:outline-none focus:bg-gray-500 focus:text-white"
          onClick={(e) => {
            e.stopPropagation();
            if (typeof onRemove === 'function') onRemove();
          }}
        >
          <span className="sr-only">Remove tag</span>
          <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
            <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
          </svg>
        </button>
      )}
    </span>
  );
}

export default Badge; 