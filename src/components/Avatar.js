import React from 'react';

export function Avatar({ 
  src, 
  alt = '', 
  initials = '', 
  square = false, 
  size = 'md',
  className = '',
  ...props 
}) {
  // Size classes mapping
  const sizeClasses = {
    'xs': 'h-4 w-4 text-xs',
    'sm': 'h-6 w-6 text-xs',
    'md': 'h-8 w-8 text-sm',
    'lg': 'h-10 w-10 text-base',
    'xl': 'h-12 w-12 text-lg'
  };
  
  const baseClasses = `inline-flex items-center justify-center font-medium ${square ? 'rounded-md' : 'rounded-full'} overflow-hidden ${sizeClasses[size] || sizeClasses.md}`;
  
  if (src) {
    return (
      <div className={`${baseClasses} ${className}`} {...props}>
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      </div>
    );
  }
  
  if (initials) {
    return (
      <div className={`${baseClasses} ${className || 'bg-indigo-600 text-white'}`} {...props}>
        {initials}
      </div>
    );
  }
  
  // Default avatar with user icon
  return (
    <div className={`${baseClasses} bg-gray-700 text-gray-300 ${className}`} {...props}>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
      </svg>
    </div>
  );
}

export default Avatar; 