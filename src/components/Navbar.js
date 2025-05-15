import React from 'react';

export function Navbar({ children, className = '' }) {
  return (
    <nav className={`bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center ${className}`}>
      {children}
    </nav>
  );
}

export function NavbarDivider({ className = '' }) {
  return <div className={`h-6 w-px bg-gray-700 mx-3 ${className}`} />;
}

export function NavbarSection({ children, className = '' }) {
  return <div className={`flex items-center ${className}`}>{children}</div>;
}

export function NavbarSpacer() {
  return <div className="flex-1" />;
}

export function NavbarItem({ 
  children, 
  href,
  current = false,
  className = '',
  onClick,
  ...props
}) {
  const baseClasses = 'py-2 px-3 rounded-md flex items-center gap-2 text-sm font-medium transition-colors duration-200';
  const activeClasses = current 
    ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
    : 'text-gray-300 hover:bg-gray-800 hover:text-white';
  
  if (href) {
    return (
      <a 
        href={href} 
        className={`${baseClasses} ${activeClasses} ${className}`}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      className={`${baseClasses} ${activeClasses} ${className}`}
      onClick={onClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

export function NavbarLabel({ children, className = '' }) {
  return <span className={`ml-2 ${className}`}>{children}</span>;
}

export default Navbar; 