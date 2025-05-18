import React, { useState, useEffect } from 'react';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import ExpenseSummary from './components/ExpenseSummary';
import ExpenseChart from './components/ExpenseChart';
import Settings from './components/Settings';
import RecurringForm from './components/RecurringForm';
import RecurringList from './components/RecurringList';
import BudgetManager from './components/BudgetManager';
import WalletTransfer from './components/WalletTransfer';
import BottomNavigation from './components/BottomNavigation';
import FloatingActionButton from './components/FloatingActionButton';
import Modal from './components/Modal';
import { 
  Navbar, 
  NavbarDivider, 
  NavbarItem, 
  NavbarLabel, 
  NavbarSection, 
  NavbarSpacer 
} from './components/Navbar';
import { 
  Dropdown, 
  DropdownButton, 
  DropdownDivider, 
  DropdownItem, 
  DropdownLabel, 
  DropdownMenu 
} from './components/Dropdown';
import { Avatar } from './components/Avatar';
import { initializeDatabase, expenseDB, categoryDB, walletDB, recurringDB, tagDB } from './utils/db';
import Wallets from './components/Wallets';
import WalletSummary from './components/WalletSummary';
import { processRecurringTransactions } from './utils/scheduler';
import TransactionListPage from './pages/TransactionListPage';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [refreshRecurring, setRefreshRecurring] = useState(0); // Counter to trigger refreshes
  const [refreshWallets, setRefreshWallets] = useState(0); // Counter to trigger wallet refreshes
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Check authentication state on component mount
  useEffect(() => {
    // The app will always require re-authentication on refresh
    // You could add session storage here to persist authentication within a tab
    // But for security purposes, we're requiring re-authentication on each refresh
    
    // To demonstrate a "remember me" feature, you could uncomment this code:
    /*
    const storedAuth = sessionStorage.getItem('isAuthenticated');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
    }
    */
  }, []);

  // Save authentication state when it changes
  useEffect(() => {
    if (isAuthenticated) {
      // For a "remember me" feature within the same tab session:
      // sessionStorage.setItem('isAuthenticated', 'true');
    } else {
      // Clear any stored session
      // sessionStorage.removeItem('isAuthenticated');
    }
  }, [isAuthenticated]);

  // Initialize database
  useEffect(() => {
    if (!isAuthenticated) return; // Don't initialize if not authenticated
    
    const init = async () => {
      try {
        const initialized = await initializeDatabase();
        setDbInitialized(initialized);
        
        if (initialized) {
          // Load all expenses after DB initialization
          loadExpenses();
          
          // Check for and process any recurring transactions that are due
          const result = await processRecurringTransactions();
          if (result.processed > 0) {
            // If transactions were processed, refresh the expenses list
            loadExpenses();
            // And update the recurring transactions counter
            setRefreshRecurring(prev => prev + 1);
          }
        } else {
          // Fall back to localStorage if IndexedDB fails
          fallbackToLocalStorage();
        }
      } catch (error) {
        console.error('Failed to initialize database:', error);
        fallbackToLocalStorage();
      } finally {
        setIsLoading(false);
      }
    };
    
    init();
  }, [isAuthenticated]); // Add isAuthenticated to dependency array

  // Handle password validation
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === 'nyobaindim') {
      setIsAuthenticated(true);
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password. Please try again.');
    }
  };

  // Fallback to localStorage if IndexedDB fails
  const fallbackToLocalStorage = () => {
    const savedExpenses = localStorage.getItem('expenses');
    if (savedExpenses) {
      setExpenses(JSON.parse(savedExpenses));
    }
    setIsLoading(false);
  };

  // Load expenses from IndexedDB
  const loadExpenses = async () => {
    try {
      const allExpenses = await expenseDB.getAll();
      setExpenses(allExpenses);
    } catch (error) {
      console.error('Error loading expenses:', error);
      fallbackToLocalStorage();
    } finally {
      setIsLoading(false);
    }
  };

  // Save expenses to localStorage (fallback)
  useEffect(() => {
    if (!dbInitialized && expenses.length > 0) {
      localStorage.setItem('expenses', JSON.stringify(expenses));
    }
  }, [expenses, dbInitialized]);

  // Add new expense
  const addExpense = async (expense) => {
    // Normalize tags: convert any tag objects to just their IDs
    // Tags from our selector should already have proper IDs now, not temporary ones
    const normalizedTags = expense.tags.map(tag => 
      typeof tag === 'object' && tag !== null ? tag.id : tag
    );
    
    // Now ensure that all tags used exist in the database
    if (dbInitialized) {
      try {
        // Get all existing tags
        const allTags = await tagDB.getAll();
        
        // Check if any normalized tag IDs don't exist in the database
        for (const tagId of normalizedTags) {
          if (!allTags.some(t => t.id === tagId)) {
            // This tag ID doesn't exist in the database yet, create it
            console.log(`Creating missing tag with ID: ${tagId}`);
            await tagDB.add({
              id: tagId,
              name: tagId.charAt(0).toUpperCase() + tagId.slice(1).replace(/-/g, ' ')
            });
          }
        }
      } catch (tagError) {
        console.error('Error checking/creating tags:', tagError);
        // Continue with adding the expense even if tag verification fails
      }
    }
    
    const newExpense = {
      ...expense,
      tags: normalizedTags,
      id: Date.now(), // Simple way to generate unique ID
      date: expense.date || new Date().toISOString().slice(0, 10) // YYYY-MM-DD format
    };
    
    if (dbInitialized) {
      try {
        // Add the expense to the database
        await expenseDB.add(newExpense);
        
        // Update wallet balance based on transaction type
        if (newExpense.walletId) {
          try {
            // Get the current wallet
            const wallets = await walletDB.getAll();
            const wallet = wallets.find(w => w.id === newExpense.walletId);
            
            if (wallet) {
              // Update wallet balance based on transaction type
              if (newExpense.isIncome) {
                // Add income to wallet balance
                wallet.balance = parseFloat(wallet.balance) + parseFloat(newExpense.amount);
              } else {
                // Subtract expense from wallet balance
                wallet.balance = parseFloat(wallet.balance) - parseFloat(newExpense.amount);
              }
              await walletDB.update(wallet);
            }
          } catch (walletError) {
            console.error('Error updating wallet balance:', walletError);
          }
        }
        
        // Reload expenses from DB
        loadExpenses();
        // Refresh wallet balance display
        setRefreshWallets(prev => prev + 1);
        // Close modal after adding expense
        setIsModalOpen(false);
      } catch (error) {
        console.error('Error adding expense:', error);
        // Fall back to state-only update
        setExpenses(prevExpenses => [...prevExpenses, newExpense]);
        setIsModalOpen(false);
      }
    } else {
      // If DB not initialized, just update state
      setExpenses(prevExpenses => [...prevExpenses, newExpense]);
      
      // Also update wallet in localStorage if available
      try {
        const savedWallets = localStorage.getItem('wallets');
        if (savedWallets && newExpense.walletId) {
          const wallets = JSON.parse(savedWallets);
          const walletIndex = wallets.findIndex(w => w.id === newExpense.walletId);
          
          if (walletIndex !== -1) {
            if (newExpense.isIncome) {
              // Add income to wallet balance
              wallets[walletIndex].balance = parseFloat(wallets[walletIndex].balance) + parseFloat(newExpense.amount);
            } else {
              // Subtract expense from wallet balance
              wallets[walletIndex].balance = parseFloat(wallets[walletIndex].balance) - parseFloat(newExpense.amount);
            }
            localStorage.setItem('wallets', JSON.stringify(wallets));
          }
        }
      } catch (e) {
        console.error('Error updating wallet in localStorage:', e);
      }
      
      // Close modal after adding expense
      setIsModalOpen(false);
      // Refresh wallet balance display
      setRefreshWallets(prev => prev + 1);
    }
  };

  // Update existing expense
  const updateExpense = async (updatedExpense) => {
    // Normalize tags: convert any tag objects to just their IDs
    // Tags from our selector should already have proper IDs now, not temporary ones
    const normalizedTags = updatedExpense.tags.map(tag => 
      typeof tag === 'object' && tag !== null ? tag.id : tag
    );
    
    const normalizedExpense = {
      ...updatedExpense,
      tags: normalizedTags
    };
    
    if (dbInitialized) {
      try {
        // Find the original expense to get the original amount and wallet
        const allExpenses = await expenseDB.getAll();
        const originalExpense = allExpenses.find(e => e.id === normalizedExpense.id);
        
        if (originalExpense) {
          // If wallets are different or amounts are different, adjust balances
          if (originalExpense.walletId !== normalizedExpense.walletId || 
              parseFloat(originalExpense.amount) !== parseFloat(normalizedExpense.amount)) {
            
            try {
              const wallets = await walletDB.getAll();
              
              // Return money to the original wallet
              if (originalExpense.walletId) {
                const originalWallet = wallets.find(w => w.id === originalExpense.walletId);
                if (originalWallet) {
                  if (originalExpense.isIncome) {
                    // Remove the income amount from the original wallet
                    originalWallet.balance = parseFloat(originalWallet.balance) - parseFloat(originalExpense.amount);
                  } else {
                    // Return the expense amount to the original wallet
                    originalWallet.balance = parseFloat(originalWallet.balance) + parseFloat(originalExpense.amount);
                  }
                  await walletDB.update(originalWallet);
                }
              }
              
              // Update the new wallet balance
              if (normalizedExpense.walletId) {
                const newWallet = wallets.find(w => w.id === normalizedExpense.walletId);
                if (newWallet) {
                  if (normalizedExpense.isIncome) {
                    // Add the income amount to the new wallet
                    newWallet.balance = parseFloat(newWallet.balance) + parseFloat(normalizedExpense.amount);
                  } else {
                    // Deduct the expense amount from the new wallet
                    newWallet.balance = parseFloat(newWallet.balance) - parseFloat(normalizedExpense.amount);
                  }
                  await walletDB.update(newWallet);
                }
              }
            } catch (walletError) {
              console.error('Error adjusting wallet balances:', walletError);
            }
          }
        }
        
        // Update the expense
        await expenseDB.update(normalizedExpense);
        
        // Reload expenses from DB
        loadExpenses();
        // Refresh wallet balance display
        setRefreshWallets(prev => prev + 1);
      } catch (error) {
        console.error('Error updating expense:', error);
        // Fall back to state-only update
        setExpenses(prevExpenses => 
          prevExpenses.map(expense => 
            expense.id === normalizedExpense.id ? normalizedExpense : expense
          )
        );
      }
    } else {
      // If DB not initialized, handle localStorage
      const savedExpenses = JSON.parse(localStorage.getItem('expenses') || '[]');
      const originalExpense = savedExpenses.find(e => e.id === normalizedExpense.id);
      
      // Adjust wallet balances in localStorage if needed
      if (originalExpense && 
          (originalExpense.walletId !== normalizedExpense.walletId || 
           parseFloat(originalExpense.amount) !== parseFloat(normalizedExpense.amount))) {
        
        try {
          const savedWallets = localStorage.getItem('wallets');
          if (savedWallets) {
            let wallets = JSON.parse(savedWallets);
            
            // Return money to the original wallet
            if (originalExpense.walletId) {
              const originalWalletIndex = wallets.findIndex(w => w.id === originalExpense.walletId);
              if (originalWalletIndex !== -1) {
                if (originalExpense.isIncome) {
                  // Remove the income amount from the original wallet
                  wallets[originalWalletIndex].balance = parseFloat(wallets[originalWalletIndex].balance) - parseFloat(originalExpense.amount);
                } else {
                  // Return the expense amount to the original wallet
                  wallets[originalWalletIndex].balance = parseFloat(wallets[originalWalletIndex].balance) + parseFloat(originalExpense.amount);
                }
              }
            }
            
            // Update the new wallet balance
            if (normalizedExpense.walletId) {
              const newWalletIndex = wallets.findIndex(w => w.id === normalizedExpense.walletId);
              if (newWalletIndex !== -1) {
                if (normalizedExpense.isIncome) {
                  // Add the income amount to the new wallet
                  wallets[newWalletIndex].balance = parseFloat(wallets[newWalletIndex].balance) + parseFloat(normalizedExpense.amount);
                } else {
                  // Deduct the expense amount from the new wallet
                  wallets[newWalletIndex].balance = parseFloat(wallets[newWalletIndex].balance) - parseFloat(normalizedExpense.amount);
                }
              }
            }
            
            localStorage.setItem('wallets', JSON.stringify(wallets));
          }
        } catch (e) {
          console.error('Error updating wallet in localStorage:', e);
        }
      }
      
      // Update expenses in state
      setExpenses(prevExpenses => 
        prevExpenses.map(expense => 
          expense.id === normalizedExpense.id ? normalizedExpense : expense
        )
      );
      // Refresh wallet balance display
      setRefreshWallets(prev => prev + 1);
    }
  };

  // Delete expense
  const deleteExpense = async (id) => {
    if (dbInitialized) {
      try {
        // Find the expense to get its amount and wallet
        const allExpenses = await expenseDB.getAll();
        const expenseToDelete = allExpenses.find(e => e.id === id);
        
        if (expenseToDelete && expenseToDelete.walletId) {
          try {
            // Get the wallet
            const wallets = await walletDB.getAll();
            const wallet = wallets.find(w => w.id === expenseToDelete.walletId);
            
            if (wallet) {
              // Add the expense amount back to the wallet balance (since expense is being deleted)
              if (expenseToDelete.isIncome) {
                // For income transactions, subtract it back from wallet balance when deleted
                wallet.balance = parseFloat(wallet.balance) - parseFloat(expenseToDelete.amount);
              } else {
                // For expenses, add it back to wallet balance when deleted
                wallet.balance = parseFloat(wallet.balance) + parseFloat(expenseToDelete.amount);
              }
              await walletDB.update(wallet);
            }
          } catch (walletError) {
            console.error('Error updating wallet balance:', walletError);
          }
        }
        
        // Delete the expense
        await expenseDB.delete(id);
        
        // Reload expenses from DB
        loadExpenses();
        // Refresh wallet balance display
        setRefreshWallets(prev => prev + 1);
      } catch (error) {
        console.error('Error deleting expense:', error);
        // Fall back to state-only update
        setExpenses(prevExpenses => prevExpenses.filter(expense => expense.id !== id));
      }
    } else {
      // If DB not initialized, find the expense in state before filtering
      const expenseToDelete = expenses.find(e => e.id === id);
      
      // Update wallet in localStorage if available
      if (expenseToDelete && expenseToDelete.walletId) {
        try {
          const savedWallets = localStorage.getItem('wallets');
          if (savedWallets) {
            let wallets = JSON.parse(savedWallets);
            const walletIndex = wallets.findIndex(w => w.id === expenseToDelete.walletId);
            
            if (walletIndex !== -1) {
              if (expenseToDelete.isIncome) {
                // For income transactions, subtract it back from wallet balance when deleted
                wallets[walletIndex].balance = parseFloat(wallets[walletIndex].balance) - parseFloat(expenseToDelete.amount);
              } else {
                // For expenses, add it back to wallet balance when deleted
                wallets[walletIndex].balance = parseFloat(wallets[walletIndex].balance) + parseFloat(expenseToDelete.amount);
              }
              localStorage.setItem('wallets', JSON.stringify(wallets));
            }
          }
        } catch (e) {
          console.error('Error updating wallet in localStorage:', e);
        }
      }
      
      // Update state
      setExpenses(prevExpenses => prevExpenses.filter(expense => expense.id !== id));
      // Refresh wallet balance display
      setRefreshWallets(prev => prev + 1);
    }
  };

  // Calculate total expenses and income
  const totalExpenses = expenses
    .filter(expense => !expense.isIncome)
    .reduce((total, expense) => total + parseFloat(expense.amount), 0);
    
  const totalIncome = expenses
    .filter(expense => expense.isIncome)
    .reduce((total, expense) => total + parseFloat(expense.amount), 0);
    
  const netCashFlow = totalIncome - totalExpenses;

  // Add recurring transaction
  const addRecurringTransaction = async (transaction) => {
    try {
      // Normalize tags: convert any tag objects to just their IDs
      const normalizedTags = transaction.tags.map(tag => 
        typeof tag === 'object' && tag !== null ? tag.id : tag
      );
      
      // Ensure all required fields exist
      const normalizedTransaction = {
        ...transaction,
        id: transaction.id || Date.now(),
        tags: normalizedTags,
        name: transaction.name || '',
        amount: parseFloat(transaction.amount || 0),
        walletId: transaction.walletId || 'cash',
        category: transaction.category || 'other',
        frequency: transaction.frequency || 'monthly',
        startDate: transaction.startDate || new Date().toISOString().slice(0, 10),
        nextDate: transaction.startDate || new Date().toISOString().slice(0, 10), // Initially use startDate as nextDate
        isIncome: !!transaction.isIncome,
        notes: transaction.notes || ''
      };
      
      if (dbInitialized) {
        try {
          console.log('Saving recurring transaction:', normalizedTransaction);
          // Add to database
          await recurringDB.add(normalizedTransaction);
          
          // Process past occurrences if the start date is in the past
          const startDate = new Date(normalizedTransaction.startDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Reset time part for proper comparison
          
          if (startDate <= today) {
            console.log('Start date is in the past, processing past occurrences');
            // Create a transaction for the start date first
            await createTransactionFromRecurring({
              ...normalizedTransaction,
              date: normalizedTransaction.startDate // Use the start date as the transaction date
            });
            
            // If start date is before today, generate additional occurrences as needed
            if (startDate < today) {
              let currentDate = startDate;
              let occurrenceDate = startDate;
              let nextDate;
              
              // Continue generating transactions until we reach today
              while (true) {
                // Calculate the next occurrence date
                nextDate = new Date(occurrenceDate);
                
                switch (normalizedTransaction.frequency) {
                  case 'daily':
                    nextDate.setDate(nextDate.getDate() + 1);
                    break;
                  case 'weekly':
                    nextDate.setDate(nextDate.getDate() + 7);
                    break;
                  case 'biweekly':
                    nextDate.setDate(nextDate.getDate() + 14);
                    break;
                  case 'monthly':
                    nextDate.setMonth(nextDate.getMonth() + 1);
                    break;
                  case 'quarterly':
                    nextDate.setMonth(nextDate.getMonth() + 3);
                    break;
                  case 'annually':
                    nextDate.setFullYear(nextDate.getFullYear() + 1);
                    break;
                  default:
                    nextDate.setMonth(nextDate.getMonth() + 1);
                }
                
                // Stop if next occurrence is in the future
                if (nextDate > today) {
                  break;
                }
                
                // Create a transaction for this occurrence
                await createTransactionFromRecurring({
                  ...normalizedTransaction,
                  date: nextDate.toISOString().slice(0, 10)
                });
                
                // Update for next iteration
                occurrenceDate = nextDate;
              }
              
              // Update the recurring transaction with the correct next date
              await recurringDB.update({
                ...normalizedTransaction,
                nextDate: nextDate.toISOString().slice(0, 10)
              });
            } else {
              // If start date is today, calculate next date
              const nextDate = calculateNextDate(
                normalizedTransaction.frequency, 
                normalizedTransaction.startDate
              );
              
              // Update recurring transaction with next date
              await recurringDB.update({
                ...normalizedTransaction,
                nextDate
              });
            }
          } else {
            console.log('Start date is in the future, nextDate remains as startDate');
            // Future start date - no transactions to create yet
          }
          
          // Refresh the expenses list to show the new transactions
          await loadExpenses();
          
          // Update wallet display
          setRefreshWallets(prev => prev + 1);
          
          // Close modal
          setIsRecurringModalOpen(false);
          
          // Refresh the recurring list
          setRefreshRecurring(prev => prev + 1);
        } catch (error) {
          console.error('Error adding recurring transaction to database:', error);
          alert('Failed to save recurring transaction. Please try again.');
        }
      } else {
        // Fallback to localStorage
        try {
          const savedRecurring = JSON.parse(localStorage.getItem('recurring-transactions') || '[]');
          savedRecurring.push(normalizedTransaction);
          localStorage.setItem('recurring-transactions', JSON.stringify(savedRecurring));
          
          // Process for localStorage
          const startDate = new Date(normalizedTransaction.startDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (startDate <= today) {
            const savedExpenses = JSON.parse(localStorage.getItem('expenses') || '[]');
            const savedWallets = JSON.parse(localStorage.getItem('wallets') || '[]');
            
            // Create a transaction for the start date
            const initialTransaction = {
              id: Date.now(),
              name: normalizedTransaction.name,
              amount: normalizedTransaction.amount,
              category: normalizedTransaction.category,
              tags: [...normalizedTransaction.tags, 'recurring'],
              walletId: normalizedTransaction.walletId,
              isIncome: normalizedTransaction.isIncome,
              notes: normalizedTransaction.notes,
              date: normalizedTransaction.startDate
            };
            
            // Add to expenses
            savedExpenses.push(initialTransaction);
            
            // Update wallet
            if (initialTransaction.walletId) {
              const walletIndex = savedWallets.findIndex(w => w.id === initialTransaction.walletId);
              if (walletIndex !== -1) {
                const adjustment = initialTransaction.isIncome ? 
                  parseFloat(initialTransaction.amount) : 
                  -parseFloat(initialTransaction.amount);
                  
                savedWallets[walletIndex].balance = parseFloat(savedWallets[walletIndex].balance) + adjustment;
              }
            }
            
            // If start date is before today, generate additional occurrences
            if (startDate < today) {
              let currentDate = startDate;
              let occurrenceDate = startDate;
              let nextDate;
              
              // Generate past transactions
              while (true) {
                nextDate = new Date(occurrenceDate);
                
                switch (normalizedTransaction.frequency) {
                  case 'daily':
                    nextDate.setDate(nextDate.getDate() + 1);
                    break;
                  case 'weekly':
                    nextDate.setDate(nextDate.getDate() + 7);
                    break;
                  case 'biweekly':
                    nextDate.setDate(nextDate.getDate() + 14);
                    break;
                  case 'monthly':
                    nextDate.setMonth(nextDate.getMonth() + 1);
                    break;
                  case 'quarterly':
                    nextDate.setMonth(nextDate.getMonth() + 3);
                    break;
                  case 'annually':
                    nextDate.setFullYear(nextDate.getFullYear() + 1);
                    break;
                  default:
                    nextDate.setMonth(nextDate.getMonth() + 1);
                }
                
                if (nextDate > today) {
                  break;
                }
                
                const recTransaction = {
                  id: Date.now() + savedExpenses.length,
                  name: normalizedTransaction.name,
                  amount: normalizedTransaction.amount,
                  category: normalizedTransaction.category,
                  tags: [...normalizedTransaction.tags, 'recurring'],
                  walletId: normalizedTransaction.walletId,
                  isIncome: normalizedTransaction.isIncome,
                  notes: normalizedTransaction.notes,
                  date: nextDate.toISOString().slice(0, 10)
                };
                
                // Add to expenses
                savedExpenses.push(recTransaction);
                
                // Update wallet
                if (recTransaction.walletId) {
                  const walletIndex = savedWallets.findIndex(w => w.id === recTransaction.walletId);
                  if (walletIndex !== -1) {
                    const adjustment = recTransaction.isIncome ? 
                      parseFloat(recTransaction.amount) : 
                      -parseFloat(recTransaction.amount);
                      
                    savedWallets[walletIndex].balance = parseFloat(savedWallets[walletIndex].balance) + adjustment;
                  }
                }
                
                occurrenceDate = nextDate;
              }
              
              // Update the recurring transaction's next date
              normalizedTransaction.nextDate = nextDate.toISOString().slice(0, 10);
              
              // Update in the saved recurring list
              const recIndex = savedRecurring.findIndex(r => r.id === normalizedTransaction.id);
              if (recIndex !== -1) {
                savedRecurring[recIndex] = normalizedTransaction;
              }
              
              localStorage.setItem('recurring-transactions', JSON.stringify(savedRecurring));
            } else {
              // If start date is today, calculate next date
              const nextDate = calculateNextDate(
                normalizedTransaction.frequency, 
                normalizedTransaction.startDate
              );
              
              // Update the recurring transaction
              normalizedTransaction.nextDate = nextDate;
              
              // Update in the saved recurring list
              const recIndex = savedRecurring.findIndex(r => r.id === normalizedTransaction.id);
              if (recIndex !== -1) {
                savedRecurring[recIndex] = normalizedTransaction;
              }
              
              localStorage.setItem('recurring-transactions', JSON.stringify(savedRecurring));
            }
            
            // Save updated expenses and wallets
            localStorage.setItem('expenses', JSON.stringify(savedExpenses));
            localStorage.setItem('wallets', JSON.stringify(savedWallets));
            
            // Update expenses state
            setExpenses(savedExpenses);
          }
          
          // Close modal
          setIsRecurringModalOpen(false);
          
          // Refresh the list
          setRefreshRecurring(prev => prev + 1);
          
          // Update wallet display
          setRefreshWallets(prev => prev + 1);
        } catch (error) {
          console.error('Error saving recurring transaction to localStorage:', error);
          alert('Failed to save recurring transaction. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error processing recurring transaction:', error);
      alert('Failed to process recurring transaction. Please try again.');
    }
  };
  
  // Helper function to create a transaction from a recurring template
  const createTransactionFromRecurring = async (recurringData) => {
    try {
      // Create the transaction object
      const newTransaction = {
        id: Date.now() + Math.floor(Math.random() * 1000), // Ensure unique ID
        name: recurringData.name,
        amount: recurringData.amount,
        category: recurringData.category,
        tags: [...recurringData.tags, 'recurring'], // Add recurring tag
        walletId: recurringData.walletId,
        isIncome: recurringData.isIncome,
        notes: recurringData.notes,
        date: recurringData.date // Use the provided date
      };
      
      // Add the transaction to the database
      await expenseDB.add(newTransaction);
      
      // Update wallet balance
      try {
        const wallets = await walletDB.getAll();
        const wallet = wallets.find(w => w.id === newTransaction.walletId);
        
        if (wallet) {
          // For income add to balance, for expense subtract
          const adjustment = newTransaction.isIncome ? 
            parseFloat(newTransaction.amount) : 
            -parseFloat(newTransaction.amount);
            
          wallet.balance = parseFloat(wallet.balance) + adjustment;
          await walletDB.update(wallet);
        }
      } catch (walletError) {
        console.error('Error updating wallet balance:', walletError);
      }
      
      return newTransaction;
    } catch (error) {
      console.error('Error creating transaction from recurring template:', error);
      throw error;
    }
  };
  
  // Helper function to calculate next date based on frequency
  const calculateNextDate = (frequency, currentDate) => {
    const date = new Date(currentDate);
    
    switch (frequency) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'biweekly':
        date.setDate(date.getDate() + 14);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'annually':
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        date.setMonth(date.getMonth() + 1); // Default to monthly
    }
    
    return date.toISOString().slice(0, 10);
  };

  // Render content based on active tab
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="text-indigo-400">
            <svg className="animate-spin h-10 w-10 mr-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-indigo-300 text-lg font-medium">Loading...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'settings':
        return <Settings dbInitialized={dbInitialized} />;
      case 'wallets':
        return (
          <>
            <Wallets dbInitialized={dbInitialized} />
            <div className="mt-8">
              <WalletTransfer 
                dbInitialized={dbInitialized} 
                refreshWallets={() => setRefreshWallets(prev => prev + 1)} 
              />
            </div>
          </>
        );
      case 'budgets':
        return <BudgetManager 
                 dbInitialized={dbInitialized} 
                 refresh={refreshWallets}
               />;
      case 'recurring':
        return (
          <>
            <RecurringList dbInitialized={dbInitialized} refreshData={refreshRecurring} />
            <div className="flex justify-end mb-8">
              <button 
                onClick={() => setIsRecurringModalOpen(true)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
              >
                Add Recurring Transaction
              </button>
            </div>
          </>
        );
      case 'transactions':
        return (
          <TransactionListPage
            expenses={expenses}
            deleteExpense={deleteExpense}
            updateExpense={updateExpense}
            dbInitialized={dbInitialized}
          />
        );
      case 'home':
      default:
        return (
          <>
            <WalletSummary dbInitialized={dbInitialized} refresh={refreshWallets} />
            <ExpenseSummary 
              expenses={expenses} 
              total={totalExpenses + totalIncome} 
            />
            <ExpenseChart expenses={expenses} />
            <ExpenseList 
              expenses={expenses} 
              deleteExpense={deleteExpense} 
              updateExpense={updateExpense} 
              dbInitialized={dbInitialized}
            />
          </>
        );
    }
  };

  return (
    <>
      {!isAuthenticated ? (
        // Password protection screen
        <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full border border-gray-700">
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-indigo-400 text-center">Rupiah Tracker</h1>
              <p className="text-gray-400 mt-2 text-center">Secured financial tracking</p>
            </div>
            
            <form onSubmit={handlePasswordSubmit}>
              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              
              {passwordError && (
                <div className="p-3 bg-red-900/50 border border-red-800 rounded-md mb-4">
                  <p className="text-red-400 text-sm">{passwordError}</p>
                </div>
              )}
              
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              >
                <div className="flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v-1l1-1 1-1-.257-.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                  </svg>
                  Unlock App
                </div>
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                This is a secure application. Unauthorized access is prohibited.
              </p>
            </div>
          </div>
        </div>
      ) : (
        // Main app content when authenticated
        <>
          {/* Modern Navbar */}
          <Navbar className="fixed top-0 left-0 right-0 shadow-md z-30">
            <Dropdown>
              <DropdownButton as={NavbarItem}>
                <NavbarLabel className="text-indigo-400 font-bold text-xl">Rupiah Tracker</NavbarLabel>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </DropdownButton>
              <DropdownMenu className="min-w-52">
                <DropdownItem onClick={() => setActiveTab('home')}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  <DropdownLabel>Home</DropdownLabel>
                </DropdownItem>
                <DropdownItem onClick={() => setActiveTab('transactions')}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                  </svg>
                  <DropdownLabel>Transactions</DropdownLabel>
                </DropdownItem>
                <DropdownItem onClick={() => setActiveTab('wallets')}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6zm2 2h4v2H8V6z" />
                  </svg>
                  <DropdownLabel>Wallets</DropdownLabel>
                </DropdownItem>
                <DropdownItem onClick={() => setActiveTab('budgets')}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm4.707 3.707a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L8.414 9H10a3 3 0 013 3v1a1 1 0 102 0v-1a5 5 0 00-5-5H8.414l1.293-1.293z" />
                  </svg>
                  <DropdownLabel>Budgets</DropdownLabel>
                </DropdownItem>
                <DropdownItem onClick={() => setActiveTab('recurring')}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <DropdownLabel>Recurring</DropdownLabel>
                </DropdownItem>
                <DropdownItem onClick={() => setActiveTab('settings')}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                  <DropdownLabel>Settings</DropdownLabel>
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem onClick={() => setIsModalOpen(true)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  <DropdownLabel>Add Transaction</DropdownLabel>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>

            <NavbarDivider className="max-md:hidden" />
            
            <NavbarSection className="max-md:hidden">
              <NavbarItem 
                onClick={() => setActiveTab('home')} 
                current={activeTab === 'home'}
              >
                Home
              </NavbarItem>
              <NavbarItem 
                onClick={() => setActiveTab('transactions')} 
                current={activeTab === 'transactions'}
              >
                Transactions
              </NavbarItem>
              <NavbarItem 
                onClick={() => setActiveTab('wallets')} 
                current={activeTab === 'wallets'}
              >
                Wallets
              </NavbarItem>
              <NavbarItem 
                onClick={() => setActiveTab('budgets')} 
                current={activeTab === 'budgets'}
              >
                Budgets
              </NavbarItem>
              <NavbarItem 
                onClick={() => setActiveTab('recurring')} 
                current={activeTab === 'recurring'}
              >
                Recurring
              </NavbarItem>
              <NavbarItem 
                onClick={() => setActiveTab('settings')} 
                current={activeTab === 'settings'}
              >
                Settings
              </NavbarItem>
            </NavbarSection>
            
            <NavbarSpacer />
            
            <NavbarSection>
              <Dropdown>
                <DropdownButton as={NavbarItem}>
                  <div className="relative">
                    <Avatar initials="RS" className="bg-indigo-600" />
                    {dbInitialized && (
                      <span className="absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-gray-900"></span>
                    )}
                  </div>
                </DropdownButton>
                <DropdownMenu className="min-w-52" anchor="bottom end">
                  <DropdownItem onClick={() => setActiveTab('settings')}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    <DropdownLabel>Settings</DropdownLabel>
                  </DropdownItem>
                  <DropdownDivider />
                  <DropdownItem>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                    </svg>
                    <DropdownLabel>About</DropdownLabel>
                  </DropdownItem>
                  <DropdownItem>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v7h-2l-1 2H8l-1-2H5V5z" clipRule="evenodd" />
                    </svg>
                    <DropdownLabel>Feedback</DropdownLabel>
                  </DropdownItem>
                  <DropdownDivider />
                  <DropdownItem onClick={() => setIsAuthenticated(false)}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm1 2h10v10H4V5zm2 3a1 1 0 011-1h4a1 1 0 110 2H7a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    <DropdownLabel>Logout</DropdownLabel>
                  </DropdownItem>
                  {dbInitialized && (
                    <div className="px-4 py-2 text-xs text-green-400 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Using IndexedDB
                    </div>
                  )}
                </DropdownMenu>
              </Dropdown>
            </NavbarSection>
          </Navbar>

          <div className="max-w-4xl mx-auto px-6 pb-24 pt-20">
            {renderContent()}
            
            {/* Floating Action Button - only visible on mobile and home tab */}
            {activeTab === 'home' && (
              <div className="md:hidden">
                <FloatingActionButton onClick={() => setIsModalOpen(true)} />
              </div>
            )}
            
            {/* Add Transaction Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
              <ExpenseForm 
                addExpense={addExpense} 
                dbInitialized={dbInitialized} 
                onClose={() => setIsModalOpen(false)} 
              />
            </Modal>
            
            {/* Add Recurring Transaction Modal */}
            <Modal isOpen={isRecurringModalOpen} onClose={() => setIsRecurringModalOpen(false)}>
              <RecurringForm 
                addRecurringTransaction={addRecurringTransaction} 
                dbInitialized={dbInitialized} 
                onClose={() => setIsRecurringModalOpen(false)} 
              />
            </Modal>
            
            {/* Show bottom navigation on mobile */}
            <div className="md:hidden">
              <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default App; 