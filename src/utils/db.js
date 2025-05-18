// IndexedDB database utility for expense tracker

const DB_NAME = 'expense-tracker-db';
const DB_VERSION = 7; // Incremented for budget feature
const EXPENSES_STORE = 'expenses';
const CATEGORIES_STORE = 'categories';
const TAGS_STORE = 'tags';
const WALLETS_STORE = 'wallets';
const RECURRING_STORE = 'recurring'; // New store for recurring transactions
const BUDGET_STORE = 'budgets'; // New store for budgets
const TRANSFERS_STORE = 'transfers'; // New store for wallet transfers

// Default categories
const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'Food' },
  { id: 'transportation', name: 'Transportation' },
  { id: 'entertainment', name: 'Entertainment' },
  { id: 'utilities', name: 'Utilities' },
  { id: 'housing', name: 'Housing' },
  { id: 'healthcare', name: 'Healthcare' },
  { id: 'other', name: 'Other' }
];

// Default tags
const DEFAULT_TAGS = [
  { id: 'essential', name: 'Essential' },
  { id: 'recurring', name: 'Recurring' },
  { id: 'emergency', name: 'Emergency' },
  { id: 'personal', name: 'Personal' },
  { id: 'work', name: 'Work' },
  { id: 'family', name: 'Family' },
  { id: 'vacation', name: 'Vacation' },
  { id: 'gift', name: 'Gift' },
  { id: 'savings', name: 'Savings' },
  { id: 'education', name: 'Education' }
];

// Default wallets
const DEFAULT_WALLETS = [
  { id: 'cash', name: 'Cash', type: 'cash', balance: 0 },
  { id: 'bank', name: 'Bank Account', type: 'bank', balance: 0 },
  { id: 'credit', name: 'Credit Card', type: 'credit_card', balance: 0 },
  { id: 'ewallet', name: 'E-Wallet', type: 'e_wallet', balance: 0 },
];

// Initialize the database
const initDB = () => {
  return new Promise((resolve, reject) => {
    // Check if IndexedDB is supported
    if (!window.indexedDB) {
      console.error("Your browser doesn't support IndexedDB");
      // Fall back to localStorage
      resolve(false);
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    // Handle database upgrade (first time or version change)
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;
      
      // First time setup or upgrade from version 0
      if (oldVersion < 1) {
        // Create expenses store with auto-incrementing id
        if (!db.objectStoreNames.contains(EXPENSES_STORE)) {
          const expensesStore = db.createObjectStore(EXPENSES_STORE, { keyPath: 'id' });
          expensesStore.createIndex('date', 'date', { unique: false });
          expensesStore.createIndex('category', 'category', { unique: false });
        }
        
        // Create categories store
        if (!db.objectStoreNames.contains(CATEGORIES_STORE)) {
          const categoriesStore = db.createObjectStore(CATEGORIES_STORE, { keyPath: 'id' });
          
          // Add default categories
          DEFAULT_CATEGORIES.forEach(category => {
            categoriesStore.add(category);
          });
        }
      }
      
      // Upgrade to version 2 - adding tags support
      if (oldVersion < 2) {
        // Create tags store if it doesn't exist
        if (!db.objectStoreNames.contains(TAGS_STORE)) {
          const tagsStore = db.createObjectStore(TAGS_STORE, { keyPath: 'id' });
          
          // Add default tags
          DEFAULT_TAGS.forEach(tag => {
            tagsStore.add(tag);
          });
        }
        
        // Update expenses store to include tags if it exists
        if (db.objectStoreNames.contains(EXPENSES_STORE)) {
          // We can't modify the schema of an existing object store in onupgradeneeded
          // So we need to create a new index for the existing store
          const transaction = event.target.transaction;
          const expensesStore = transaction.objectStore(EXPENSES_STORE);
          
          // Get all existing expenses
          expensesStore.openCursor().onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              // Add tags array to existing expenses if they don't have it
              if (!cursor.value.tags) {
                const updatedExpense = { ...cursor.value, tags: [] };
                cursor.update(updatedExpense);
              }
              cursor.continue();
            }
          };
        }
      }
      
      // Upgrade to version 3 - add wallets support
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains(WALLETS_STORE)) {
          const walletsStore = db.createObjectStore(WALLETS_STORE, { keyPath: 'id' });
          DEFAULT_WALLETS.forEach(wallet => walletsStore.add(wallet));
        }
      }
      
      // Upgrade to version 4 - add walletId to expenses
      if (oldVersion < 4) {
        if (db.objectStoreNames.contains(EXPENSES_STORE)) {
          const transaction = event.target.transaction;
          const expensesStore = transaction.objectStore(EXPENSES_STORE);
          expensesStore.openCursor().onsuccess = async (event) => {
            const cursor = event.target.result;
            if (cursor) {
              if (!cursor.value.walletId) {
                // Assign to 'cash' wallet by default
                const updatedExpense = { ...cursor.value, walletId: 'cash' };
                cursor.update(updatedExpense);
              }
              cursor.continue();
            }
          };
        }
      }
      
      // Upgrade to version 5 - add income tracking, notes and photo support
      if (oldVersion < 5) {
        if (db.objectStoreNames.contains(EXPENSES_STORE)) {
          const transaction = event.target.transaction;
          const expensesStore = transaction.objectStore(EXPENSES_STORE);
          
          expensesStore.openCursor().onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              // Add new fields to existing expenses
              const updatedExpense = { 
                ...cursor.value, 
                isIncome: cursor.value.isIncome || false,
                notes: cursor.value.notes || '',
                photoUrl: cursor.value.photoUrl || ''
              };
              cursor.update(updatedExpense);
              cursor.continue();
            }
          };
        }
      }
      
      // Upgrade to version 6 - add recurring transactions
      if (oldVersion < 6) {
        if (!db.objectStoreNames.contains(RECURRING_STORE)) {
          const recurringStore = db.createObjectStore(RECURRING_STORE, { keyPath: 'id' });
          recurringStore.createIndex('nextDate', 'nextDate', { unique: false });
          recurringStore.createIndex('frequency', 'frequency', { unique: false });
        }
      }
      
      // Upgrade to version 7 - add budgets and transfers
      if (oldVersion < 7) {
        // Create budgets store
        if (!db.objectStoreNames.contains(BUDGET_STORE)) {
          const budgetStore = db.createObjectStore(BUDGET_STORE, { keyPath: 'id' });
          budgetStore.createIndex('category', 'category', { unique: false });
          budgetStore.createIndex('period', 'period', { unique: false });
        }
        
        // Create transfers store
        if (!db.objectStoreNames.contains(TRANSFERS_STORE)) {
          const transfersStore = db.createObjectStore(TRANSFERS_STORE, { keyPath: 'id' });
          transfersStore.createIndex('date', 'date', { unique: false });
          transfersStore.createIndex('fromWallet', 'fromWallet', { unique: false });
          transfersStore.createIndex('toWallet', 'toWallet', { unique: false });
        }
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      resolve(true);
      db.close();
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      reject(event.target.error);
    };
  });
};

// Expense operations
const expenseDB = {
  // Get all expenses
  getAll: () => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(EXPENSES_STORE, 'readonly');
        const store = transaction.objectStore(EXPENSES_STORE);
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          resolve(getAllRequest.result);
          db.close();
        };
        
        getAllRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  
  // Add a new expense
  add: (expense) => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(EXPENSES_STORE, 'readwrite');
        const store = transaction.objectStore(EXPENSES_STORE);
        
        // Make sure ID is a number and include new fields
        const newExpense = {
          ...expense,
          id: expense.id || Date.now(),
          walletId: expense.walletId || 'cash',
          isIncome: expense.isIncome || false,
          notes: expense.notes || '',
          photoUrl: expense.photoUrl || ''
        };
        
        const addRequest = store.add(newExpense);
        
        addRequest.onsuccess = () => {
          resolve(newExpense);
          db.close();
        };
        
        addRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  
  // Update an expense
  update: (expense) => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(EXPENSES_STORE, 'readwrite');
        const store = transaction.objectStore(EXPENSES_STORE);
        
        // Preserve all fields including new ones
        const updatedExpense = { 
          ...expense, 
          walletId: expense.walletId || 'cash',
          isIncome: expense.isIncome || false,
          notes: expense.notes || '',
          photoUrl: expense.photoUrl || ''
        };
        
        const updateRequest = store.put(updatedExpense);
        
        updateRequest.onsuccess = () => {
          resolve(expense);
          db.close();
        };
        
        updateRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  
  // Delete an expense
  delete: (id) => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(EXPENSES_STORE, 'readwrite');
        const store = transaction.objectStore(EXPENSES_STORE);
        
        const deleteRequest = store.delete(id);
        
        deleteRequest.onsuccess = () => {
          resolve(id);
          db.close();
        };
        
        deleteRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
};

// Category operations
const categoryDB = {
  // Get all categories
  getAll: () => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(CATEGORIES_STORE, 'readonly');
        const store = transaction.objectStore(CATEGORIES_STORE);
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          resolve(getAllRequest.result);
          db.close();
        };
        
        getAllRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  
  // Add a new category
  add: (category) => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(CATEGORIES_STORE, 'readwrite');
        const store = transaction.objectStore(CATEGORIES_STORE);
        
        const addRequest = store.add(category);
        
        addRequest.onsuccess = () => {
          resolve(category);
          db.close();
        };
        
        addRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  
  // Update a category
  update: (category) => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(CATEGORIES_STORE, 'readwrite');
        const store = transaction.objectStore(CATEGORIES_STORE);
        
        const updateRequest = store.put(category);
        
        updateRequest.onsuccess = () => {
          resolve(category);
          db.close();
        };
        
        updateRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  
  // Delete a category
  delete: (id) => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(CATEGORIES_STORE, 'readwrite');
        const store = transaction.objectStore(CATEGORIES_STORE);
        
        const deleteRequest = store.delete(id);
        
        deleteRequest.onsuccess = () => {
          resolve(id);
          db.close();
        };
        
        deleteRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
};

// Tags operations
const tagDB = {
  // Get all tags
  getAll: () => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(TAGS_STORE, 'readonly');
        const store = transaction.objectStore(TAGS_STORE);
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          resolve(getAllRequest.result);
          db.close();
        };
        
        getAllRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  
  // Add a new tag
  add: (tag) => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(TAGS_STORE, 'readwrite');
        const store = transaction.objectStore(TAGS_STORE);
        
        const addRequest = store.add(tag);
        
        addRequest.onsuccess = () => {
          resolve(tag);
          db.close();
        };
        
        addRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  
  // Update a tag
  update: (tag) => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(TAGS_STORE, 'readwrite');
        const store = transaction.objectStore(TAGS_STORE);
        
        const updateRequest = store.put(tag);
        
        updateRequest.onsuccess = () => {
          resolve(tag);
          db.close();
        };
        
        updateRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  
  // Delete a tag
  delete: (id) => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(TAGS_STORE, 'readwrite');
        const store = transaction.objectStore(TAGS_STORE);
        
        const deleteRequest = store.delete(id);
        
        deleteRequest.onsuccess = () => {
          resolve(id);
          db.close();
        };
        
        deleteRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
};

// Wallets operations
const walletDB = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(WALLETS_STORE, 'readonly');
        const store = transaction.objectStore(WALLETS_STORE);
        const getAllRequest = store.getAll();
        getAllRequest.onsuccess = () => {
          resolve(getAllRequest.result);
          db.close();
        };
        getAllRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  add: (wallet) => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(WALLETS_STORE, 'readwrite');
        const store = transaction.objectStore(WALLETS_STORE);
        const addRequest = store.add(wallet);
        addRequest.onsuccess = () => {
          resolve(wallet);
          db.close();
        };
        addRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  update: (wallet) => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(WALLETS_STORE, 'readwrite');
        const store = transaction.objectStore(WALLETS_STORE);
        const updateRequest = store.put(wallet);
        updateRequest.onsuccess = () => {
          resolve(wallet);
          db.close();
        };
        updateRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  delete: (id) => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(WALLETS_STORE, 'readwrite');
        const store = transaction.objectStore(WALLETS_STORE);
        const deleteRequest = store.delete(id);
        deleteRequest.onsuccess = () => {
          resolve(id);
          db.close();
        };
        deleteRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
};

// Recurring transaction operations
const recurringDB = {
  // Get all recurring transactions
  getAll: () => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(RECURRING_STORE, 'readonly');
        const store = transaction.objectStore(RECURRING_STORE);
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          resolve(getAllRequest.result);
          db.close();
        };
        
        getAllRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },

  // Get recurring transaction by ID
  getById: (id) => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(RECURRING_STORE, 'readonly');
        const store = transaction.objectStore(RECURRING_STORE);
        const getRequest = store.get(id);
        
        getRequest.onsuccess = () => {
          resolve(getRequest.result);
          db.close();
        };
        
        getRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },

  // Add new recurring transaction
  add: (recurring) => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(RECURRING_STORE, 'readwrite');
        const store = transaction.objectStore(RECURRING_STORE);
        const addRequest = store.add(recurring);
        
        addRequest.onsuccess = () => {
          resolve(recurring);
          db.close();
        };
        
        addRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },

  // Update existing recurring transaction
  update: (recurring) => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(RECURRING_STORE, 'readwrite');
        const store = transaction.objectStore(RECURRING_STORE);
        const updateRequest = store.put(recurring);
        
        updateRequest.onsuccess = () => {
          resolve(recurring);
          db.close();
        };
        
        updateRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },

  // Delete recurring transaction
  delete: (id) => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(RECURRING_STORE, 'readwrite');
        const store = transaction.objectStore(RECURRING_STORE);
        const deleteRequest = store.delete(id);
        
        deleteRequest.onsuccess = () => {
          resolve(true);
          db.close();
        };
        
        deleteRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  
  // Get due recurring transactions based on a date
  getDueTransactions: (date = new Date()) => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(RECURRING_STORE, 'readonly');
        const store = transaction.objectStore(RECURRING_STORE);
        const nextDateIndex = store.index('nextDate');
        
        // Format date to YYYY-MM-DD for comparison
        const formatDate = (date) => {
          return date.toISOString().split('T')[0];
        };
        
        // Get all recurring transactions with nextDate less than or equal to the provided date
        const dateStr = formatDate(date);
        const range = IDBKeyRange.upperBound(dateStr);
        const request = nextDateIndex.getAll(range);
        
        request.onsuccess = () => {
          resolve(request.result);
          db.close();
        };
        
        request.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
};

// Budget operations
const budgetDB = {
  // Get all budgets
  getAll: () => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(BUDGET_STORE, 'readonly');
        const store = transaction.objectStore(BUDGET_STORE);
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          resolve(getAllRequest.result);
          db.close();
        };
        
        getAllRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  
  // Get budgets by category
  getByCategory: (category) => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(BUDGET_STORE, 'readonly');
        const store = transaction.objectStore(BUDGET_STORE);
        const index = store.index('category');
        const getRequest = index.getAll(category);
        
        getRequest.onsuccess = () => {
          resolve(getRequest.result);
          db.close();
        };
        
        getRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  
  // Add a new budget
  add: (budget) => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(BUDGET_STORE, 'readwrite');
        const store = transaction.objectStore(BUDGET_STORE);
        
        // Ensure ID is present
        const newBudget = {
          ...budget,
          id: budget.id || Date.now()
        };
        
        const addRequest = store.add(newBudget);
        
        addRequest.onsuccess = () => {
          resolve(newBudget);
          db.close();
        };
        
        addRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  
  // Update existing budget
  update: (budget) => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(BUDGET_STORE, 'readwrite');
        const store = transaction.objectStore(BUDGET_STORE);
        const updateRequest = store.put(budget);
        
        updateRequest.onsuccess = () => {
          resolve(budget);
          db.close();
        };
        
        updateRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  
  // Delete budget
  delete: (id) => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(BUDGET_STORE, 'readwrite');
        const store = transaction.objectStore(BUDGET_STORE);
        const deleteRequest = store.delete(id);
        
        deleteRequest.onsuccess = () => {
          resolve(true);
          db.close();
        };
        
        deleteRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
};

// Transfer operations
const transferDB = {
  // Get all transfers
  getAll: () => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(TRANSFERS_STORE, 'readonly');
        const store = transaction.objectStore(TRANSFERS_STORE);
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          resolve(getAllRequest.result);
          db.close();
        };
        
        getAllRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  
  // Add a new transfer
  add: (transfer) => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(TRANSFERS_STORE, 'readwrite');
        const store = transaction.objectStore(TRANSFERS_STORE);
        
        // Ensure ID is present
        const newTransfer = {
          ...transfer,
          id: transfer.id || Date.now(),
          date: transfer.date || new Date().toISOString().slice(0, 10),
          photoUrl: transfer.photoUrl || ''
        };
        
        const addRequest = store.add(newTransfer);
        
        addRequest.onsuccess = () => {
          resolve(newTransfer);
          db.close();
        };
        
        addRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  
  // Update existing transfer
  update: (transfer) => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(TRANSFERS_STORE, 'readwrite');
        const store = transaction.objectStore(TRANSFERS_STORE);
        
        // Make sure ID exists
        if (!transfer.id) {
          reject(new Error("Transfer ID is required for update"));
          db.close();
          return;
        }
        
        // Ensure other fields have defaults
        const updatedTransfer = {
          ...transfer,
          date: transfer.date || new Date().toISOString().slice(0, 10),
          photoUrl: transfer.photoUrl || ''
        };
        
        const updateRequest = store.put(updatedTransfer);
        
        updateRequest.onsuccess = () => {
          resolve(updatedTransfer);
          db.close();
        };
        
        updateRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },
  
  // Delete transfer
  delete: (id) => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(TRANSFERS_STORE, 'readwrite');
        const store = transaction.objectStore(TRANSFERS_STORE);
        const deleteRequest = store.delete(id);
        
        deleteRequest.onsuccess = () => {
          resolve(true);
          db.close();
        };
        
        deleteRequest.onerror = (error) => {
          reject(error);
          db.close();
        };
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
};

// Helper function to migrate data from localStorage to IndexedDB
const migrateFromLocalStorage = async () => {
  try {
    // Migrate expenses if they exist
    const savedExpenses = localStorage.getItem('expenses');
    if (savedExpenses) {
      const expenses = JSON.parse(savedExpenses);
      for (const expense of expenses) {
        await expenseDB.add(expense);
      }
      // Clear localStorage after successful migration
      localStorage.removeItem('expenses');
    }
    
    // Migrate categories if they exist
    const savedCategories = localStorage.getItem('expense-categories');
    if (savedCategories) {
      const categories = JSON.parse(savedCategories);
      for (const category of categories) {
        await categoryDB.add(category).catch(() => {
          // Category might already exist, just ignore
        });
      }
      // Clear localStorage after successful migration
      localStorage.removeItem('expense-categories');
    }
    
    return true;
  } catch (error) {
    console.error('Error migrating data:', error);
    return false;
  }
};

// Initialize database and export methods
const initializeDatabase = async () => {
  try {
    // Initialize the database
    const initialized = await initDB();
    
    // If successful, attempt to migrate data from localStorage
    if (initialized) {
      await migrateFromLocalStorage();
    }
    
    return initialized;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return false;
  }
};

// Function to delete the IndexedDB database (for troubleshooting)
const deleteDatabase = () => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      console.error("IndexedDB not supported");
      resolve(false);
      return;
    }

    const deleteRequest = window.indexedDB.deleteDatabase(DB_NAME);
    
    deleteRequest.onsuccess = () => {
      console.log("Database deleted successfully");
      resolve(true);
    };
    
    deleteRequest.onerror = (event) => {
      console.error("Error deleting database:", event.target.error);
      reject(event.target.error);
    };
    
    deleteRequest.onblocked = () => {
      console.warn("Database deletion blocked - close all other tabs with this app open");
      // Try again after a short delay
      setTimeout(() => {
        window.indexedDB.deleteDatabase(DB_NAME);
        resolve(true);
      }, 1000);
    };
  });
};

// Reset and recreate database with latest schema
const resetDatabase = async () => {
  try {
    console.log("Starting database reset...");
    
    // First, backup data from existing database
    let expenses = [];
    let categories = [];
    let tags = [];
    let wallets = [];
    let recurring = [];
    let budgets = [];
    let transfers = [];
    
    try {
      // Only backup data if we can access it
      try { expenses = await expenseDB.getAll(); } catch (e) { console.log("Could not backup expenses"); }
      try { categories = await categoryDB.getAll(); } catch (e) { console.log("Could not backup categories"); }
      try { tags = await tagDB.getAll(); } catch (e) { console.log("Could not backup tags"); }
      try { wallets = await walletDB.getAll(); } catch (e) { console.log("Could not backup wallets"); }
      try { recurring = await recurringDB.getAll(); } catch (e) { console.log("Could not backup recurring"); }
      try { budgets = await budgetDB.getAll(); } catch (e) { console.log("Could not backup budgets"); }
      try { transfers = await transferDB.getAll(); } catch (e) { console.log("Could not backup transfers"); }
    } catch (backupError) {
      console.warn("Error backing up data:", backupError);
      // Continue with reset even if backup fails
    }
    
    // Now delete the database
    await deleteDatabase();
    console.log("Database deleted, recreating...");
    
    // Recreate database with latest schema
    const initialized = await initDB();
    
    if (!initialized) {
      throw new Error("Failed to initialize database after reset");
    }
    
    console.log("Database recreated, restoring data...");
    
    // Restore data
    try {
      // Restore categories first as expenses depend on them
      for (const category of categories) {
        try {
          await categoryDB.add(category).catch(() => {
            // Category might already exist (from defaults), just ignore
          });
        } catch (e) {
          console.warn("Error restoring category:", category.id);
        }
      }
      
      // Restore tags
      for (const tag of tags) {
        try {
          await tagDB.add(tag).catch(() => {
            // Tag might already exist, just ignore
          });
        } catch (e) {
          console.warn("Error restoring tag:", tag.id);
        }
      }
      
      // Restore wallets
      for (const wallet of wallets) {
        try {
          await walletDB.add(wallet).catch(() => {
            // Wallet might already exist, just ignore
          });
        } catch (e) {
          console.warn("Error restoring wallet:", wallet.id);
        }
      }
      
      // Restore expenses
      for (const expense of expenses) {
        try {
          await expenseDB.add(expense);
        } catch (e) {
          console.warn("Error restoring expense:", expense.id);
        }
      }
      
      // Restore recurring
      for (const rec of recurring) {
        try {
          await recurringDB.add(rec);
        } catch (e) {
          console.warn("Error restoring recurring:", rec.id);
        }
      }
      
      // Restore budgets
      for (const budget of budgets) {
        try {
          await budgetDB.add(budget);
        } catch (e) {
          console.warn("Error restoring budget:", budget.id);
        }
      }
      
      // Restore transfers
      for (const transfer of transfers) {
        try {
          await transferDB.add(transfer);
        } catch (e) {
          console.warn("Error restoring transfer:", transfer.id);
        }
      }
      
      console.log("Data restoration complete");
    } catch (restoreError) {
      console.error("Error restoring data:", restoreError);
      // Continue even if some data couldn't be restored
    }
    
    return true;
  } catch (error) {
    console.error("Database reset failed:", error);
    return false;
  }
};

// Export the database utilities
export {
  initializeDatabase,
  deleteDatabase,
  resetDatabase,
  expenseDB,
  categoryDB,
  tagDB,
  walletDB,
  recurringDB,
  budgetDB,
  transferDB
}; 