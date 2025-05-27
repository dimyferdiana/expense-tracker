import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  startIndex,
  endIndex,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [5, 10, 20],
  showItemsPerPage = true,
  showJumpToPage = true,
  showResultsInfo = true,
  className = ""
}) {
  // Generate page numbers for pagination controls
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show smart pagination with ellipsis
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, currentPage + 2);
      
      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) pages.push('...');
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleJumpToPage = (e) => {
    const page = parseInt(e.target.value, 10);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  // Don't render pagination if there's only one page or no items
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={`flex items-center justify-between border-t border-gray-700 bg-gray-800 px-4 py-3 sm:px-6 ${className}`}>
      {/* Mobile view - Previous/Next only */}
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={goToPreviousPage}
          disabled={currentPage === 1}
          className={`relative inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
            currentPage === 1
              ? 'border-gray-600 bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Previous
        </button>
        <button
          onClick={goToNextPage}
          disabled={currentPage === totalPages}
          className={`relative ml-3 inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
            currentPage === totalPages
              ? 'border-gray-600 bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Next
        </button>
      </div>

      {/* Desktop view */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        {/* Left side - Results info and items per page */}
        <div className="flex items-center gap-6">
          {showResultsInfo && (
            <div>
              <p className="text-sm text-gray-300">
                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                <span className="font-medium">{endIndex}</span> of{' '}
                <span className="font-medium">{totalItems}</span> results
              </p>
            </div>
          )}
          
          {showItemsPerPage && onItemsPerPageChange && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => onItemsPerPageChange(parseInt(e.target.value, 10))}
                className="bg-gray-700 text-white text-sm rounded-md px-2 py-1 border border-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {itemsPerPageOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <span className="text-sm text-gray-400">per page</span>
            </div>
          )}
        </div>

        {/* Right side - Navigation */}
        <div className="flex items-center gap-4">
          {/* Jump to page */}
          {showJumpToPage && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Go to:</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={handleJumpToPage}
                className="w-16 bg-gray-700 text-white text-sm rounded-md px-2 py-1 border border-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center"
              />
              <span className="text-sm text-gray-400">of {totalPages}</span>
            </div>
          )}

          {/* Page navigation */}
          <nav aria-label="Pagination" className="isolate inline-flex -space-x-px rounded-md shadow-sm">
            {/* Previous button */}
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center rounded-l-md px-2 py-2 ring-1 ring-inset focus:z-20 focus:outline-offset-0 transition-colors ${
                currentPage === 1
                  ? 'text-gray-500 ring-gray-600 cursor-not-allowed'
                  : 'text-gray-400 ring-gray-600 hover:bg-gray-700'
              }`}
            >
              <span className="sr-only">Previous</span>
              <ChevronLeftIcon aria-hidden="true" className="h-5 w-5" />
            </button>

            {/* Page numbers */}
            {getPageNumbers().map((page, index) => (
              <React.Fragment key={index}>
                {page === '...' ? (
                  <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-400 ring-1 ring-inset ring-gray-600">
                    ...
                  </span>
                ) : (
                  <button
                    onClick={() => onPageChange(page)}
                    aria-current={currentPage === page ? 'page' : undefined}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset focus:z-20 focus:outline-offset-0 transition-colors ${
                      currentPage === page
                        ? 'z-10 bg-indigo-600 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                        : 'text-gray-300 ring-gray-600 hover:bg-gray-700'
                    } ${
                      index === 0 && page !== '...' ? '' : ''
                    }`}
                  >
                    {page}
                  </button>
                )}
              </React.Fragment>
            ))}

            {/* Next button */}
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className={`relative inline-flex items-center rounded-r-md px-2 py-2 ring-1 ring-inset focus:z-20 focus:outline-offset-0 transition-colors ${
                currentPage === totalPages
                  ? 'text-gray-500 ring-gray-600 cursor-not-allowed'
                  : 'text-gray-400 ring-gray-600 hover:bg-gray-700'
              }`}
            >
              <span className="sr-only">Next</span>
              <ChevronRightIcon aria-hidden="true" className="h-5 w-5" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

export default Pagination; 