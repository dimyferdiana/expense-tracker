import { useState, useCallback } from 'react';

export function useNotification() {
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback((options) => {
    const {
      title = 'Notification',
      message,
      type = 'info',
      showCancel = false,
      onConfirm,
      confirmText = 'OK',
      cancelText = 'Cancel'
    } = options;

    setNotification({
      title,
      message,
      type,
      showCancel,
      onConfirm,
      confirmText,
      cancelText,
      isOpen: true
    });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  // Convenience methods for different types
  const showSuccess = useCallback((message, title = 'Success') => {
    showNotification({ title, message, type: 'success' });
  }, [showNotification]);

  const showError = useCallback((message, title = 'Error') => {
    showNotification({ title, message, type: 'error' });
  }, [showNotification]);

  const showWarning = useCallback((message, title = 'Warning') => {
    showNotification({ title, message, type: 'warning' });
  }, [showNotification]);

  const showInfo = useCallback((message, title = 'Information') => {
    showNotification({ title, message, type: 'info' });
  }, [showNotification]);

  const showConfirm = useCallback((message, onConfirm, title = 'Confirm') => {
    showNotification({ 
      title, 
      message, 
      type: 'warning', 
      showCancel: true, 
      onConfirm,
      confirmText: 'Yes',
      cancelText: 'No'
    });
  }, [showNotification]);

  return {
    notification,
    showNotification,
    hideNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm
  };
} 