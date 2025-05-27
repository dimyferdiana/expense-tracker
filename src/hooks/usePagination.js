import { useState, useEffect, useMemo } from 'react';

/**
 * Custom hook for pagination logic
 * @param {Array} data - The array of data to paginate
 * @param {number} initialItemsPerPage - Initial number of items per page (default: 10)
 * @param {string} storageKey - localStorage key to persist pagination preferences
 * @returns {Object} Pagination state and methods
 */
function usePagination(data = [], initialItemsPerPage = 10, storageKey = null) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  // Load saved pagination preferences from localStorage
  useEffect(() => {
    if (storageKey) {
      const savedItemsPerPage = localStorage.getItem(`${storageKey}_itemsPerPage`);
      const savedCurrentPage = localStorage.getItem(`${storageKey}_currentPage`);
      
      if (savedItemsPerPage) {
        setItemsPerPage(parseInt(savedItemsPerPage, 10));
      }
      
      // Only restore current page if it's valid for the current data
      if (savedCurrentPage) {
        const page = parseInt(savedCurrentPage, 10);
        const maxPage = Math.ceil(data.length / (savedItemsPerPage || initialItemsPerPage));
        if (page >= 1 && page <= maxPage) {
          setCurrentPage(page);
        }
      }
    }
  }, [storageKey, initialItemsPerPage, data.length]);

  // Reset to first page when data changes significantly or items per page changes
  useEffect(() => {
    const maxPage = Math.ceil(data.length / itemsPerPage);
    if (currentPage > maxPage && maxPage > 0) {
      setCurrentPage(1);
    }
  }, [data.length, itemsPerPage, currentPage]);

  // Memoized pagination calculations for efficiency
  const paginationData = useMemo(() => {
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = data.slice(startIndex, endIndex);
    
    return {
      totalItems,
      totalPages,
      currentData,
      startIndex,
      endIndex: Math.min(endIndex, totalItems),
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1
    };
  }, [data, currentPage, itemsPerPage]);

  // Handle page changes
  const goToPage = (page) => {
    if (page >= 1 && page <= paginationData.totalPages) {
      setCurrentPage(page);
      
      // Save to localStorage if storage key is provided
      if (storageKey) {
        localStorage.setItem(`${storageKey}_currentPage`, page.toString());
      }
    }
  };

  const goToPreviousPage = () => {
    if (paginationData.hasPreviousPage) {
      goToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (paginationData.hasNextPage) {
      goToPage(currentPage + 1);
    }
  };

  const goToFirstPage = () => {
    goToPage(1);
  };

  const goToLastPage = () => {
    goToPage(paginationData.totalPages);
  };

  // Handle items per page change
  const changeItemsPerPage = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing page size
    
    // Save to localStorage if storage key is provided
    if (storageKey) {
      localStorage.setItem(`${storageKey}_itemsPerPage`, newItemsPerPage.toString());
      localStorage.setItem(`${storageKey}_currentPage`, '1');
    }
  };

  // Reset pagination to initial state
  const resetPagination = () => {
    setCurrentPage(1);
    setItemsPerPage(initialItemsPerPage);
    
    if (storageKey) {
      localStorage.removeItem(`${storageKey}_currentPage`);
      localStorage.removeItem(`${storageKey}_itemsPerPage`);
    }
  };

  // Get page numbers for pagination UI (with ellipsis logic)
  const getPageNumbers = (maxVisiblePages = 5) => {
    const { totalPages } = paginationData;
    const pages = [];
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show smart pagination with ellipsis
      const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      // Adjust start page if we're near the end
      const adjustedStartPage = Math.max(1, endPage - maxVisiblePages + 1);
      
      if (adjustedStartPage > 1) {
        pages.push(1);
        if (adjustedStartPage > 2) pages.push('...');
      }
      
      for (let i = adjustedStartPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return {
    // Current state
    currentPage,
    itemsPerPage,
    
    // Pagination data
    ...paginationData,
    
    // Navigation methods
    goToPage,
    goToPreviousPage,
    goToNextPage,
    goToFirstPage,
    goToLastPage,
    changeItemsPerPage,
    resetPagination,
    
    // Utility methods
    getPageNumbers,
    
    // Convenience flags
    isEmpty: paginationData.totalItems === 0,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === paginationData.totalPages,
    
    // For debugging
    debug: {
      currentPage,
      itemsPerPage,
      totalItems: paginationData.totalItems,
      totalPages: paginationData.totalPages,
      startIndex: paginationData.startIndex,
      endIndex: paginationData.endIndex
    }
  };
}

export default usePagination; 