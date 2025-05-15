import React, { useState, useRef, useEffect } from 'react';

const DropdownContext = React.createContext();

export function Dropdown({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative" ref={containerRef}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownButton({ children, as: Component = 'button', className = '', ...props }) {
  const { isOpen, setIsOpen } = React.useContext(DropdownContext);

  const handleClick = (e) => {
    e.preventDefault();
    setIsOpen(!isOpen);
    if (props.onClick) {
      props.onClick(e);
    }
  };

  return (
    <Component
      className={className}
      onClick={handleClick}
      aria-expanded={isOpen}
      {...props}
    >
      {children}
    </Component>
  );
}

export function DropdownMenu({ 
  children, 
  className = '', 
  anchor = 'bottom start' 
}) {
  const { isOpen } = React.useContext(DropdownContext);

  if (!isOpen) return null;

  // Determine position classes based on the anchor
  let positionClasses = 'mt-2 left-0';
  if (anchor === 'bottom end') {
    positionClasses = 'mt-2 right-0';
  } else if (anchor === 'top start') {
    positionClasses = 'bottom-full mb-2 left-0';
  } else if (anchor === 'top end') {
    positionClasses = 'bottom-full mb-2 right-0';
  }

  return (
    <div 
      className={`absolute ${positionClasses} z-30 bg-gray-800 rounded-md shadow-lg py-1 border border-gray-700 ${className}`}
    >
      {children}
    </div>
  );
}

export function DropdownItem({ 
  children, 
  href, 
  className = '', 
  onClick,
  ...props 
}) {
  const { setIsOpen } = React.useContext(DropdownContext);

  const handleClick = (e) => {
    setIsOpen(false);
    if (onClick) {
      onClick(e);
    }
  };

  if (href) {
    return (
      <a 
        href={href} 
        className={`flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white ${className}`}
        onClick={handleClick}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <button 
      type="button"
      className={`w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white ${className}`}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownLabel({ children, className = '' }) {
  return <span className={className}>{children}</span>;
}

export function DropdownDivider({ className = '' }) {
  return <div className={`border-t border-gray-700 my-1 ${className}`} />;
}

export default Dropdown; 