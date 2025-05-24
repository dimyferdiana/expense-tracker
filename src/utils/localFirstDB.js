import { SyncManager } from './syncManager';
import { 
  expenseDB as localExpenseDB,
  categoryDB as localCategoryDB,
  walletDB as localWalletDB,
  transferDB as localTransferDB,
  budgetDB as localBudgetDB,
  tagDB as localTagDB,
  recurringDB as localRecurringDB
} from './db';

/**
 * Local-First Database Layer
 * All operations go to IndexedDB first, with automatic sync tracking
 */
class LocalFirstDB {
  constructor(localDB, syncManager) {
    this.localDB = localDB;
    this.syncManager = syncManager;
  }

  async getAll() {
    return await this.localDB.getAll();
  }

  async getById(id) {
    return await this.localDB.getById?.(id) || null;
  }

  async add(data) {
    const result = await this.localDB.add(data);
    this.syncManager?.markLocalChange();
    return result;
  }

  async update(data) {
    const result = await this.localDB.update(data);
    this.syncManager?.markLocalChange();
    return result;
  }

  async delete(id) {
    const result = await this.localDB.delete(id);
    this.syncManager?.markLocalChange();
    return result;
  }
}

/**
 * Factory to create local-first database instances
 */
export const createLocalFirstDB = (user) => {
  const syncManager = user ? new SyncManager(user) : null;
  
  return {
    expense: new LocalFirstDB(localExpenseDB, syncManager),
    category: new LocalFirstDB(localCategoryDB, syncManager),
    wallet: new LocalFirstDB(localWalletDB, syncManager),
    transfer: new LocalFirstDB(localTransferDB, syncManager),
    budget: new LocalFirstDB(localBudgetDB, syncManager),
    tag: new LocalFirstDB(localTagDB, syncManager),
    recurring: new LocalFirstDB(localRecurringDB, syncManager),
    syncManager
  };
}; 