import Decimal from 'decimal.js';
import supabase from './supabase';
import { walletDB as supabaseWalletDB } from './supabase-db';

// Configure Decimal.js for financial calculations
Decimal.config({
  precision: 10,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9,
  toExpPos: 21,
  minE: -9,
  maxE: 21
});

/**
 * Safe wallet balance operations with transaction support
 */
export class WalletOperations {
  constructor(user) {
    this.user = user;
    this.pendingOperations = [];
  }

  /**
   * Add a decimal amount to a wallet balance
   */
  static addToBalance(currentBalance, amount) {
    const current = new Decimal(currentBalance || 0);
    const adjustment = new Decimal(amount || 0);
    return current.plus(adjustment).toNumber();
  }

  /**
   * Subtract a decimal amount from a wallet balance
   */
  static subtractFromBalance(currentBalance, amount) {
    const current = new Decimal(currentBalance || 0);
    const adjustment = new Decimal(amount || 0);
    return current.minus(adjustment).toNumber();
  }

  /**
   * Calculate wallet adjustment for expense/income
   */
  static calculateAdjustment(amount, isIncome, isReverse = false) {
    const value = new Decimal(amount || 0);
    
    if (isReverse) {
      // Reverse operation: opposite of the original
      return isIncome ? value.negated().toNumber() : value.toNumber();
    } else {
      // Normal operation
      return isIncome ? value.toNumber() : value.negated().toNumber();
    }
  }

  /**
   * Validate wallet balance before operation
   */
  async validateWalletBalance(walletId, requiredAmount, isDeduction = true) {
    if (!walletId || !this.user?.id) {
      throw new Error('Invalid wallet ID or user not authenticated');
    }

    const wallets = await supabaseWalletDB.getAll(this.user.id);
    const wallet = wallets.find(w => w.id === walletId);
    
    if (!wallet) {
      throw new Error(`Wallet with ID ${walletId} not found`);
    }

    if (isDeduction) {
      const currentBalance = new Decimal(wallet.balance || 0);
      const required = new Decimal(requiredAmount || 0);
      
      if (currentBalance.lt(required)) {
        throw new Error(`Insufficient balance in wallet ${wallet.name}. Current: ${currentBalance.toFixed(2)}, Required: ${required.toFixed(2)}`);
      }
    }

    return wallet;
  }

  /**
   * Execute wallet balance update with retry logic
   */
  async updateWalletBalance(wallet, newBalance, maxRetries = 3) {
    const updatedWallet = {
      ...wallet,
      balance: new Decimal(newBalance).toNumber()
    };

    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await supabaseWalletDB.update(updatedWallet, this.user.id);
        
        console.log(`Wallet balance updated (attempt ${attempt}):`, {
          walletId: wallet.id,
          walletName: wallet.name,
          oldBalance: new Decimal(wallet.balance).toFixed(2),
          newBalance: new Decimal(newBalance).toFixed(2),
          adjustment: new Decimal(newBalance).minus(wallet.balance).toFixed(2)
        });
        
        return updatedWallet;
      } catch (error) {
        lastError = error;
        console.warn(`Wallet update attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Wait with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    throw new Error(`Failed to update wallet after ${maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Add expense/income with atomic wallet update
   */
  async addExpenseWithWalletUpdate(expense, options = {}) {
    if (!this.user?.id) {
      throw new Error('User not authenticated');
    }

    // Validate wallet exists and has sufficient balance for expenses
    // Skip validation if explicitly disabled (for emergency data entry)
    const isExpense = !expense.is_income;
    if (!options.skipBalanceValidation) {
      await this.validateWalletBalance(
        expense.wallet_id, 
        expense.amount, 
        isExpense
      );
    } else {
      console.warn('⚠️ Balance validation skipped for expense:', expense.id);
      // Still validate wallet exists
      const wallets = await supabaseWalletDB.getAll(this.user.id);
      const wallet = wallets.find(w => w.id === expense.wallet_id);
      if (!wallet) {
        throw new Error(`Wallet with ID ${expense.wallet_id} not found`);
      }
    }

    // Start transaction-like operation
    const rollbackOperations = [];
    
    try {
      // 1. Add expense to database
      const { expenseDB: supabaseExpenseDB } = await import('./supabase-db');
      const savedExpense = await supabaseExpenseDB.add(expense, this.user.id);
      rollbackOperations.push(() => supabaseExpenseDB.delete(savedExpense.id, this.user.id));

      // 2. Update wallet balance
      const wallets = await supabaseWalletDB.getAll(this.user.id);
      const wallet = wallets.find(w => w.id === expense.wallet_id);
      
      if (!wallet) {
        throw new Error(`Wallet with ID ${expense.wallet_id} not found`);
      }

      const adjustment = WalletOperations.calculateAdjustment(expense.amount, expense.is_income);
      const newBalance = WalletOperations.addToBalance(wallet.balance, adjustment);
      
      const updatedWallet = await this.updateWalletBalance(wallet, newBalance);
      rollbackOperations.push(() => this.updateWalletBalance(updatedWallet, wallet.balance));

      return {
        expense: savedExpense,
        wallet: updatedWallet
      };
    } catch (error) {
      console.error('Error in addExpenseWithWalletUpdate, rolling back:', error);
      
      // Execute rollback operations in reverse order
      for (let i = rollbackOperations.length - 1; i >= 0; i--) {
        try {
          await rollbackOperations[i]();
        } catch (rollbackError) {
          console.error('Rollback operation failed:', rollbackError);
        }
      }
      
      throw error;
    }
  }

  /**
   * Update expense with proper wallet balance handling
   */
  async updateExpenseWithWalletUpdate(updatedExpense) {
    if (!this.user?.id) {
      throw new Error('User not authenticated');
    }

    // Get original expense data
    const { data: originalExpense, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', updatedExpense.id)
      .eq('user_id', this.user.id)
      .single();

    if (fetchError || !originalExpense) {
      throw new Error('Original expense not found or unauthorized');
    }

    const rollbackOperations = [];
    const walletUpdates = new Map(); // Track wallet updates to avoid duplicate operations

    try {
      // Get all wallets
      const wallets = await supabaseWalletDB.getAll(this.user.id);
      
      const originalWallet = wallets.find(w => w.id === originalExpense.wallet_id);
      const newWallet = wallets.find(w => w.id === updatedExpense.wallet_id);

      // Handle case where original wallet no longer exists
      if (!originalWallet) {
        console.warn(`Original wallet ${originalExpense.wallet_id} not found. This may be a deleted wallet. Skipping wallet balance restoration.`);
        
        // Just validate the new wallet and proceed
        if (!newWallet) {
          throw new Error(`New wallet ${updatedExpense.wallet_id} not found`);
        }
        
        // Only apply the new transaction to the new wallet
        const newAdjustment = WalletOperations.calculateAdjustment(
          updatedExpense.amount, 
          updatedExpense.is_income
        );
        const newBalance = WalletOperations.addToBalance(newWallet.balance, newAdjustment);
        
        // Validate sufficient balance for expenses
        if (!updatedExpense.is_income && new Decimal(newBalance).lt(0)) {
          throw new Error('Insufficient balance in destination wallet');
        }
        
        walletUpdates.set(newWallet.id, {
          wallet: newWallet,
          newBalance,
          oldBalance: newWallet.balance
        });
      } else if (!newWallet) {
        throw new Error(`New wallet ${updatedExpense.wallet_id} not found`);
      } else {
        // Both wallets exist - proceed with normal logic
        if (originalExpense.wallet_id === updatedExpense.wallet_id) {
          // Same wallet - calculate net adjustment
          const originalAdjustment = WalletOperations.calculateAdjustment(
            originalExpense.amount, 
            originalExpense.is_income, 
            true // reverse
          );
          const newAdjustment = WalletOperations.calculateAdjustment(
            updatedExpense.amount, 
            updatedExpense.is_income
          );
          
          const netAdjustment = new Decimal(originalAdjustment).plus(newAdjustment).toNumber();
          const newBalance = WalletOperations.addToBalance(originalWallet.balance, netAdjustment);
          
          // Validate sufficient balance for expenses
          if (!updatedExpense.is_income && new Decimal(newBalance).lt(0)) {
            throw new Error('Insufficient balance for this operation');
          }
          
          walletUpdates.set(originalWallet.id, {
            wallet: originalWallet,
            newBalance,
            oldBalance: originalWallet.balance
          });
        } else {
          // Different wallets - reverse original and apply new
          
          // 1. Reverse original transaction
          const originalAdjustment = WalletOperations.calculateAdjustment(
            originalExpense.amount, 
            originalExpense.is_income, 
            true // reverse
          );
          const originalNewBalance = WalletOperations.addToBalance(originalWallet.balance, originalAdjustment);
          
          walletUpdates.set(originalWallet.id, {
            wallet: originalWallet,
            newBalance: originalNewBalance,
            oldBalance: originalWallet.balance
          });

          // 2. Apply new transaction
          const newAdjustment = WalletOperations.calculateAdjustment(
            updatedExpense.amount, 
            updatedExpense.is_income
          );
          const newWalletNewBalance = WalletOperations.addToBalance(newWallet.balance, newAdjustment);
          
          // Validate sufficient balance for expenses
          if (!updatedExpense.is_income && new Decimal(newWalletNewBalance).lt(0)) {
            throw new Error('Insufficient balance in destination wallet');
          }
          
          walletUpdates.set(newWallet.id, {
            wallet: newWallet,
            newBalance: newWalletNewBalance,
            oldBalance: newWallet.balance
          });
        }
      }

      // Update all affected wallets
      for (const [walletId, updateInfo] of walletUpdates) {
        const updatedWallet = await this.updateWalletBalance(updateInfo.wallet, updateInfo.newBalance);
        rollbackOperations.push(() => this.updateWalletBalance(updatedWallet, updateInfo.oldBalance));
      }

      // Update the expense in database
      const { expenseDB: supabaseExpenseDB } = await import('./supabase-db');
      await supabaseExpenseDB.update(updatedExpense, this.user.id);
      rollbackOperations.push(() => supabaseExpenseDB.update(originalExpense, this.user.id));

      return {
        expense: updatedExpense,
        walletUpdates: Array.from(walletUpdates.values())
      };
    } catch (error) {
      console.error('Error in updateExpenseWithWalletUpdate, rolling back:', error);
      
      // Execute rollback operations in reverse order
      for (let i = rollbackOperations.length - 1; i >= 0; i--) {
        try {
          await rollbackOperations[i]();
        } catch (rollbackError) {
          console.error('Rollback operation failed:', rollbackError);
        }
      }
      
      throw error;
    }
  }

  /**
   * Delete expense with wallet balance restoration
   */
  async deleteExpenseWithWalletUpdate(expenseId) {
    if (!this.user?.id) {
      throw new Error('User not authenticated');
    }

    // Get expense data before deletion
    const { data: expense } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .eq('user_id', this.user.id)
      .single();

    if (!expense) {
      throw new Error('Expense not found');
    }

    const rollbackOperations = [];
    
    try {
      // Update wallet balance (reverse the transaction)
      const wallets = await supabaseWalletDB.getAll(this.user.id);
      const wallet = wallets.find(w => w.id === expense.wallet_id);
      
      if (wallet) {
        const adjustment = WalletOperations.calculateAdjustment(
          expense.amount, 
          expense.is_income, 
          true // reverse
        );
        const newBalance = WalletOperations.addToBalance(wallet.balance, adjustment);
        
        const updatedWallet = await this.updateWalletBalance(wallet, newBalance);
        rollbackOperations.push(() => this.updateWalletBalance(updatedWallet, wallet.balance));
      }

      // Delete expense from database
      const { expenseDB: supabaseExpenseDB } = await import('./supabase-db');
      await supabaseExpenseDB.delete(expenseId, this.user.id);
      rollbackOperations.push(() => supabaseExpenseDB.add(expense, this.user.id));

      return {
        deletedExpense: expense,
        wallet: wallet
      };
    } catch (error) {
      console.error('Error in deleteExpenseWithWalletUpdate, rolling back:', error);
      
      // Execute rollback operations in reverse order
      for (let i = rollbackOperations.length - 1; i >= 0; i--) {
        try {
          await rollbackOperations[i]();
        } catch (rollbackError) {
          console.error('Rollback operation failed:', rollbackError);
        }
      }
      
      throw error;
    }
  }

  /**
   * Execute wallet transfer with atomic operations
   */
  async executeWalletTransfer(transferData) {
    if (!this.user?.id) {
      throw new Error('User not authenticated');
    }

    const { fromWallet: fromWalletId, toWallet: toWalletId, amount } = transferData;
    
    // Validate transfer data
    if (!fromWalletId || !toWalletId || !amount) {
      throw new Error('Invalid transfer data: missing wallet IDs or amount');
    }
    
    if (fromWalletId === toWalletId) {
      throw new Error('Cannot transfer to the same wallet');
    }

    // Validate and get wallets
    const sourceWallet = await this.validateWalletBalance(fromWalletId, amount, true);
    const destWallet = await this.validateWalletBalance(toWalletId, 0, false);

    const rollbackOperations = [];
    
    try {
      // Calculate new balances
      const sourceNewBalance = WalletOperations.subtractFromBalance(sourceWallet.balance, amount);
      const destNewBalance = WalletOperations.addToBalance(destWallet.balance, amount);

      // Update source wallet
      const updatedSourceWallet = await this.updateWalletBalance(sourceWallet, sourceNewBalance);
      rollbackOperations.push(() => this.updateWalletBalance(updatedSourceWallet, sourceWallet.balance));

      // Update destination wallet
      const updatedDestWallet = await this.updateWalletBalance(destWallet, destNewBalance);
      rollbackOperations.push(() => this.updateWalletBalance(updatedDestWallet, destWallet.balance));

      // Create transfer record
      const { transferDB: supabaseTransferDB } = await import('./supabase-db');
      const finalTransferData = {
        ...transferData,
        id: transferData.id || Date.now(),
        fromWalletName: sourceWallet.name,
        toWalletName: destWallet.name,
        amount: new Decimal(amount).toNumber(),
        timestamp: new Date().toISOString()
      };
      
      const savedTransfer = await supabaseTransferDB.add(finalTransferData, this.user.id);
      rollbackOperations.push(() => supabaseTransferDB.delete(savedTransfer.id, this.user.id));

      return {
        transfer: savedTransfer,
        sourceWallet: updatedSourceWallet,
        destWallet: updatedDestWallet
      };
    } catch (error) {
      console.error('Error in executeWalletTransfer, rolling back:', error);
      
      // Execute rollback operations in reverse order
      for (let i = rollbackOperations.length - 1; i >= 0; i--) {
        try {
          await rollbackOperations[i]();
        } catch (rollbackError) {
          console.error('Rollback operation failed:', rollbackError);
        }
      }
      
      throw error;
    }
  }

  /**
   * Update wallet transfer with proper balance handling
   */
  async updateWalletTransfer(transferId, updatedTransferData) {
    if (!this.user?.id) {
      throw new Error('User not authenticated');
    }

    // Get original transfer data
    const { transferDB: supabaseTransferDB } = await import('./supabase-db');
    const originalTransfer = await supabaseTransferDB.getById(transferId, this.user.id);
    
    if (!originalTransfer) {
      throw new Error('Original transfer not found');
    }

    const rollbackOperations = [];
    
    try {
      // Get all wallets
      const wallets = await supabaseWalletDB.getAll(this.user.id);
      
      // Reverse original transfer
      const origSource = wallets.find(w => w.id === originalTransfer.fromWallet);
      const origDest = wallets.find(w => w.id === originalTransfer.toWallet);
      
      if (!origSource || !origDest) {
        throw new Error('Original transfer wallets not found');
      }

      // Calculate balances after reversing original transfer
      const origSourceRestoredBalance = WalletOperations.addToBalance(origSource.balance, originalTransfer.amount);
      const origDestRestoredBalance = WalletOperations.subtractFromBalance(origDest.balance, originalTransfer.amount);

      // Get new transfer wallets
      const newSource = wallets.find(w => w.id === updatedTransferData.fromWallet);
      const newDest = wallets.find(w => w.id === updatedTransferData.toWallet);
      
      if (!newSource || !newDest) {
        throw new Error('New transfer wallets not found');
      }

      // Calculate final balances after applying new transfer
      let finalSourceBalance, finalDestBalance;
      
      if (originalTransfer.fromWallet === updatedTransferData.fromWallet) {
        // Same source wallet
        finalSourceBalance = origSourceRestoredBalance;
      } else {
        // Different source wallet - restore original source and get current new source
        finalSourceBalance = newSource.balance;
      }
      
      if (originalTransfer.toWallet === updatedTransferData.toWallet) {
        // Same destination wallet
        finalDestBalance = origDestRestoredBalance;
      } else {
        // Different destination wallet - restore original dest and get current new dest
        finalDestBalance = newDest.balance;
      }

      // Apply new transfer
      finalSourceBalance = WalletOperations.subtractFromBalance(finalSourceBalance, updatedTransferData.amount);
      finalDestBalance = WalletOperations.addToBalance(finalDestBalance, updatedTransferData.amount);

      // Validate sufficient balance
      if (new Decimal(finalSourceBalance).lt(0)) {
        throw new Error('Insufficient balance in source wallet for this transfer');
      }

      // Track all wallet updates needed
      const walletUpdatesToExecute = [];

      // Restore original wallets if they're different from new ones
      if (originalTransfer.fromWallet !== updatedTransferData.fromWallet) {
        walletUpdatesToExecute.push({
          wallet: origSource,
          newBalance: origSourceRestoredBalance,
          oldBalance: origSource.balance
        });
      }
      
      if (originalTransfer.toWallet !== updatedTransferData.toWallet) {
        walletUpdatesToExecute.push({
          wallet: origDest,
          newBalance: origDestRestoredBalance,
          oldBalance: origDest.balance
        });
      }

      // Apply new transfer
      walletUpdatesToExecute.push({
        wallet: newSource,
        newBalance: finalSourceBalance,
        oldBalance: newSource.balance
      });
      
      walletUpdatesToExecute.push({
        wallet: newDest,
        newBalance: finalDestBalance,
        oldBalance: newDest.balance
      });

      // Execute wallet updates
      for (const update of walletUpdatesToExecute) {
        const updatedWallet = await this.updateWalletBalance(update.wallet, update.newBalance);
        rollbackOperations.push(() => this.updateWalletBalance(updatedWallet, update.oldBalance));
      }

      // Update transfer record
      const finalTransferData = {
        ...updatedTransferData,
        id: transferId,
        fromWalletName: newSource.name,
        toWalletName: newDest.name,
        amount: new Decimal(updatedTransferData.amount).toNumber(),
        timestamp: new Date().toISOString()
      };
      
      await supabaseTransferDB.update(finalTransferData, this.user.id);
      rollbackOperations.push(() => supabaseTransferDB.update(originalTransfer, this.user.id));

      return {
        transfer: finalTransferData,
        walletUpdates: walletUpdatesToExecute
      };
    } catch (error) {
      console.error('Error in updateWalletTransfer, rolling back:', error);
      
      // Execute rollback operations in reverse order
      for (let i = rollbackOperations.length - 1; i >= 0; i--) {
        try {
          await rollbackOperations[i]();
        } catch (rollbackError) {
          console.error('Rollback operation failed:', rollbackError);
        }
      }
      
      throw error;
    }
  }

  /**
   * Delete wallet transfer with proper balance reversal
   */
  async deleteWalletTransfer(transferId) {
    if (!this.user?.id) {
      throw new Error('User not authenticated');
    }

    // Get transfer data
    const { transferDB: supabaseTransferDB } = await import('./supabase-db');
    const transferToDelete = await supabaseTransferDB.getById(transferId, this.user.id);
    
    if (!transferToDelete) {
      throw new Error('Transfer not found');
    }

    const rollbackOperations = [];
    
    try {
      // Get all wallets
      const wallets = await supabaseWalletDB.getAll(this.user.id);
      
      // Find the affected wallets
      const sourceWallet = wallets.find(w => w.id === transferToDelete.fromWallet);
      const destWallet = wallets.find(w => w.id === transferToDelete.toWallet);
      
      if (!sourceWallet || !destWallet) {
        throw new Error('One or both wallets involved in this transfer no longer exist');
      }

      // Calculate reversed balances (reverse the transfer)
      // Add amount back to source wallet, subtract from destination wallet
      const restoredSourceBalance = WalletOperations.addToBalance(sourceWallet.balance, transferToDelete.amount);
      const restoredDestBalance = WalletOperations.subtractFromBalance(destWallet.balance, transferToDelete.amount);

      // Update source wallet
      const updatedSourceWallet = await this.updateWalletBalance(sourceWallet, restoredSourceBalance);
      rollbackOperations.push(() => this.updateWalletBalance(updatedSourceWallet, sourceWallet.balance));

      // Update destination wallet  
      const updatedDestWallet = await this.updateWalletBalance(destWallet, restoredDestBalance);
      rollbackOperations.push(() => this.updateWalletBalance(updatedDestWallet, destWallet.balance));

      // Delete transfer record
      await supabaseTransferDB.delete(transferId, this.user.id);
      rollbackOperations.push(() => supabaseTransferDB.create(transferToDelete, this.user.id));

      return {
        deletedTransfer: transferToDelete,
        sourceWallet: updatedSourceWallet,
        destWallet: updatedDestWallet,
        message: `Transfer deleted: Added ${transferToDelete.amount} back to ${sourceWallet.name}, subtracted ${transferToDelete.amount} from ${destWallet.name}`
      };
    } catch (error) {
      console.error('Error in deleteWalletTransfer, rolling back:', error);
      
      // Execute rollback operations in reverse order
      for (let i = rollbackOperations.length - 1; i >= 0; i--) {
        try {
          await rollbackOperations[i]();
        } catch (rollbackError) {
          console.error('Rollback operation failed:', rollbackError);
        }
      }
      
      throw error;
    }
  }

  /**
   * Manually correct wallet balance (for data recovery/correction)
   * Use this when wallet balance becomes corrupted or needs manual adjustment
   */
  async correctWalletBalance(walletId, newBalance, reason = 'Manual correction') {
    if (!this.user?.id) {
      throw new Error('User not authenticated');
    }

    const wallets = await supabaseWalletDB.getAll(this.user.id);
    const wallet = wallets.find(w => w.id === walletId);
    
    if (!wallet) {
      throw new Error(`Wallet with ID ${walletId} not found`);
    }

    const oldBalance = wallet.balance;
    const correctedBalance = new Decimal(newBalance).toNumber();
    
    console.log(`🔧 Correcting wallet balance:`, {
      walletId: wallet.id,
      walletName: wallet.name,
      oldBalance: new Decimal(oldBalance).toFixed(2),
      newBalance: new Decimal(correctedBalance).toFixed(2),
      adjustment: new Decimal(correctedBalance).minus(oldBalance).toFixed(2),
      reason
    });

    const updatedWallet = await this.updateWalletBalance(wallet, correctedBalance);
    
    return {
      wallet: updatedWallet,
      oldBalance,
      newBalance: correctedBalance,
      adjustment: correctedBalance - oldBalance
    };
  }

  /**
   * Recalculate wallet balance from all transactions
   * This will scan all expenses and transfers to calculate the correct balance
   */
  async recalculateWalletBalance(walletId) {
    if (!this.user?.id) {
      throw new Error('User not authenticated');
    }

    const wallets = await supabaseWalletDB.getAll(this.user.id);
    const wallet = wallets.find(w => w.id === walletId);
    
    if (!wallet) {
      throw new Error(`Wallet with ID ${walletId} not found`);
    }

    // Get all expenses for this wallet
    const { expenseDB: supabaseExpenseDB } = await import('./supabase-db');
    const { transferDB: supabaseTransferDB } = await import('./supabase-db');
    
    const [expenses, transfers] = await Promise.all([
      supabaseExpenseDB.getAll(this.user.id),
      supabaseTransferDB.getAll(this.user.id)
    ]);

    // Filter expenses for this wallet (excluding soft-deleted ones)
    const walletExpenses = expenses.filter(e => 
      e.wallet_id === walletId && !e.deleted_at
    );

    // Filter transfers involving this wallet
    const incomingTransfers = transfers.filter(t => t.toWallet === walletId);
    const outgoingTransfers = transfers.filter(t => t.fromWallet === walletId);

    // Calculate balance from transactions
    let calculatedBalance = new Decimal(0);

    // Add income, subtract expenses
    walletExpenses.forEach(expense => {
      if (expense.is_income) {
        calculatedBalance = calculatedBalance.plus(expense.amount);
      } else {
        calculatedBalance = calculatedBalance.minus(expense.amount);
      }
    });

    // Add incoming transfers
    incomingTransfers.forEach(transfer => {
      calculatedBalance = calculatedBalance.plus(transfer.amount);
    });

    // Subtract outgoing transfers
    outgoingTransfers.forEach(transfer => {
      calculatedBalance = calculatedBalance.minus(transfer.amount);
    });

    const oldBalance = wallet.balance;
    const newBalance = calculatedBalance.toNumber();

    console.log(`📊 Wallet balance recalculation:`, {
      walletId: wallet.id,
      walletName: wallet.name,
      oldBalance: new Decimal(oldBalance).toFixed(2),
      calculatedBalance: new Decimal(newBalance).toFixed(2),
      difference: new Decimal(newBalance).minus(oldBalance).toFixed(2),
      transactions: {
        expenses: walletExpenses.length,
        incomingTransfers: incomingTransfers.length,
        outgoingTransfers: outgoingTransfers.length
      }
    });

    // Update the wallet with calculated balance
    const updatedWallet = await this.updateWalletBalance(wallet, newBalance);
    
    return {
      wallet: updatedWallet,
      oldBalance,
      newBalance,
      difference: newBalance - oldBalance,
      transactionCounts: {
        expenses: walletExpenses.length,
        incomingTransfers: incomingTransfers.length,
        outgoingTransfers: outgoingTransfers.length
      }
    };
  }
}

/**
 * Helper function to create WalletOperations instance
 */
export const createWalletOperations = (user) => {
  return new WalletOperations(user);
};

/**
 * Static utility functions for balance calculations
 */
export const WalletUtils = {
  addToBalance: WalletOperations.addToBalance,
  subtractFromBalance: WalletOperations.subtractFromBalance,
  calculateAdjustment: WalletOperations.calculateAdjustment,
  
  /**
   * Format balance for display
   */
  formatBalance: (balance) => {
    return new Decimal(balance || 0).toFixed(2);
  },
  
  /**
   * Check if balance is sufficient
   */
  hasSufficientBalance: (currentBalance, requiredAmount) => {
    return new Decimal(currentBalance || 0).gte(new Decimal(requiredAmount || 0));
  },
  
  /**
   * Calculate percentage change in balance
   */
  calculatePercentageChange: (oldBalance, newBalance) => {
    const old = new Decimal(oldBalance || 0);
    const newVal = new Decimal(newBalance || 0);
    
    if (old.isZero()) {
      return newVal.isZero() ? 0 : 100;
    }
    
    return newVal.minus(old).div(old).mul(100).toNumber();
  }
}; 