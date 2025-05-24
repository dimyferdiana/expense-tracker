import React, { useState, useEffect } from 'react';
import ExpenseList from '../components/ExpenseList';
import FilterSortModal from '../components/FilterSortModal';
import { 
  categoryDB as supabaseCategoryDB, 
  tagDB as supabaseTagDB, 
  walletDB as supabaseWalletDB 
} from '../utils/supabase-db';
import { useAuth } from '../contexts/AuthContext';

function TransactionListPage({
  expenses: allExpenses, // Rename prop to avoid conflict
  deleteExpense,
  updateExpense,
  dbInitialized
}) {
  const { user } = useAuth();
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all', // 'all', 'income', 'expense'
    walletId: 'all',
    categoryId: 'all',
    tags: [],
    dateRange: 'all', // 'all', 'today', 'thisWeek', 'thisMonth', 'custom'
    startDate: '',
    endDate: '',
  });
  const [sort, setSort] = useState({
    field: 'date', // 'date', 'amount'
    order: 'desc' // 'asc', 'desc'
  });
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [availableWallets, setAvailableWallets] = useState([]);
  const [filteredSortedExpenses, setFilteredSortedExpenses] = useState([]);

  // Load categories, tags, and wallets
  useEffect(() => {
    const loadFilterData = async () => {
      try {
        if (dbInitialized && user) {
          const categoriesData = await supabaseCategoryDB.getAll(user.id);
          setAvailableCategories(categoriesData);
          const tagsData = await supabaseTagDB.getAll(user.id);
          setAvailableTags(tagsData);
          const walletsData = await supabaseWalletDB.getAll(user.id);
          setAvailableWallets(walletsData);
        } else {
           // Fallback to localStorage if IndexedDB fails
          const savedCategories = localStorage.getItem('expense-categories');
          if (savedCategories) setAvailableCategories(JSON.parse(savedCategories));
          const savedTags = localStorage.getItem('expense-tags');
          if (savedTags) setAvailableTags(JSON.parse(savedTags));
          const savedWallets = localStorage.getItem('wallets');
          if (savedWallets) setAvailableWallets(JSON.parse(savedWallets));
        }
      } catch (error) {
        console.error('Error loading filter data:', error);
      }
    };
    loadFilterData();
  }, [dbInitialized, user]);

  // Apply filters and sorting whenever expenses, filters, or sort criteria change
  useEffect(() => {
    let filtered = allExpenses;

    // Apply filters
    if (filters.type !== 'all') {
      filtered = filtered.filter(expense => 
        filters.type === 'income' ? expense.isIncome : !expense.isIncome
      );
    }
    if (filters.walletId !== 'all') {
      filtered = filtered.filter(expense => expense.walletId === filters.walletId);
    }
    if (filters.categoryId !== 'all') {
      filtered = filtered.filter(expense => expense.category === filters.categoryId);
    }
    // TODO: Implement tag filtering logic
    // if (filters.tags.length > 0) {
    //   filtered = filtered.filter(expense => 
    //     expense.tags.some(tagId => filters.tags.includes(tagId))
    //   );
    // }
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.date);
        expenseDate.setHours(0, 0, 0, 0); // Normalize expense date to start of day

        switch (filters.dateRange) {
          case 'today':
            return expenseDate.getTime() === today.getTime();
          case 'thisWeek':
            const firstDayOfWeek = new Date(today);
            firstDayOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
            const lastDayOfWeek = new Date(today);
            lastDayOfWeek.setDate(today.getDate() + (6 - today.getDay())); // Saturday
            return expenseDate >= firstDayOfWeek && expenseDate <= lastDayOfWeek;
          case 'thisMonth':
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            return expenseDate >= firstDayOfMonth && expenseDate <= lastDayOfMonth;
          // case 'custom': // TODO: Implement custom date range filtering
          //   const start = new Date(filters.startDate);
          //   const end = new Date(filters.endDate);
          //   return expenseDate >= start && expenseDate <= end;
          default:
            return true; // Should not happen if dateRange is not 'all'
        }
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      const aValue = sort.field === 'amount' ? parseFloat(a.amount) : new Date(a.date);
      const bValue = sort.field === 'amount' ? parseFloat(b.amount) : new Date(b.date);

      if (sort.order === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredSortedExpenses(sorted);
  }, [allExpenses, filters, sort]);

  const handleApplyFilters = (newFilters, newSort) => {
    setFilters(newFilters);
    setSort(newSort);
    setIsFilterModalOpen(false);
  };

  return (
    <div className="transaction-list-page">
      <div className="flex justify-between items-center mb-4 mt-4">
        <h2 className="text-xl font-semibold text-indigo-300">Transaction History</h2>
        <button
          onClick={() => setIsFilterModalOpen(true)}
          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
          </svg>
          Filter & Sort
        </button>
      </div>
      
      {/* We can add page-specific elements here later if needed */}
      <ExpenseList
        expenses={filteredSortedExpenses}
        deleteExpense={deleteExpense}
        updateExpense={updateExpense}
        dbInitialized={dbInitialized}
      />

      <FilterSortModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
        initialSort={sort}
        availableCategories={availableCategories}
        availableTags={availableTags}
        availableWallets={availableWallets}
      />
    </div>
  );
}

export default TransactionListPage; 