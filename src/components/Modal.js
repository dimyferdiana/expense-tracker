import React, { useEffect } from 'react';

function Modal({ isOpen, onClose, children }) {
  // Close modal when Escape key is pressed
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="relative max-w-lg w-full h-[80vh] flex flex-col bg-gray-800 rounded-lg shadow-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default Modal; 