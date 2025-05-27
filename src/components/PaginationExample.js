import React from 'react';
import Pagination from './Pagination';
import usePagination from '../hooks/usePagination';

/**
 * Example component demonstrating efficient pagination usage
 * This shows how to implement pagination for any list of data
 */
function PaginationExample({ data = [], title = "Data List" }) {
  // Use the pagination hook with data, initial page size, and storage key
  const pagination = usePagination(data, 5, 'exampleList');

  // Early return if no data
  if (pagination.isEmpty) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-indigo-300 mb-4">{title}</h2>
        <p className="text-gray-400">No data available.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-indigo-300 mb-4">{title}</h2>
      
      {/* Top pagination controls */}
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        itemsPerPage={pagination.itemsPerPage}
        startIndex={pagination.startIndex}
        endIndex={pagination.endIndex}
        onPageChange={pagination.goToPage}
        onItemsPerPageChange={pagination.changeItemsPerPage}
        itemsPerPageOptions={[5, 10, 20]}
        className="mb-4"
      />

      {/* Data list - only renders current page data */}
      <div className="space-y-2">
        {pagination.currentData.map((item, index) => (
          <div 
            key={item.id || index} 
            className="bg-gray-700 p-3 rounded border-l-4 border-indigo-500"
          >
            <div className="text-white">
              {typeof item === 'object' ? JSON.stringify(item) : item}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom pagination controls (simplified) */}
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        itemsPerPage={pagination.itemsPerPage}
        startIndex={pagination.startIndex}
        endIndex={pagination.endIndex}
        onPageChange={pagination.goToPage}
        onItemsPerPageChange={pagination.changeItemsPerPage}
        showItemsPerPage={false} // Hide items per page selector at bottom
        showJumpToPage={false}   // Hide jump to page at bottom
        className="mt-4"
      />

      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 bg-gray-900 rounded text-xs text-gray-400">
          <strong>Debug Info:</strong>
          <pre>{JSON.stringify(pagination.debug, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default PaginationExample; 