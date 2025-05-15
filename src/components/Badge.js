import React from 'react';
import { getColorClasses } from '../utils/colors';

function Badge({ children, color = 'gray', className = '', ...props }) {
  const colorClasses = getColorClasses(color);
  
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge; 