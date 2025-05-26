/**
 * Comprehensive Data Integrity and Validation System
 * Ensures data consistency across local and cloud storage
 */

import { 
  expenseDB as localExpenseDB,
  categoryDB as localCategoryDB,
  walletDB as localWalletDB,
  transferDB as localTransferDB,
  budgetDB as localBudgetDB,
  tagDB as localTagDB,
  recurringDB as localRecurringDB,
  cleanupUtils
} from './db';

import {
  expenseDB as supabaseExpenseDB,
  categoryDB as supabaseCategoryDB,
  walletDB as supabaseWalletDB,
  transferDB as supabaseTransferDB,
  budgetDB as supabaseBudgetDB,
  tagDB as supabaseTagDB,
  recurringDB as supabaseRecurringDB
} from './supabase-db';

// Validation rules for each data type
const VALIDATION_RULES = {
  expenses: {
    required: ['id', 'name', 'amount', 'category', 'walletId', 'date'],
    types: {
      id: 'string',
      name: 'string',
      amount: 'number',
      category: 'string',
      walletId: 'string',
      date: 'string',
      isIncome: 'boolean',
      tags: 'array'
    },
    constraints: {
      amount: (value) => value > 0,
      name: (value) => value.length > 0 && value.length <= 100,
      date: (value) => !isNaN(Date.parse(value))
    }
  },
  categories: {
    required: ['id', 'name'],
    types: {
      id: 'string',
      name: 'string',
      color: 'string'
    },
    constraints: {
      name: (value) => value.length > 0 && value.length <= 50
    }
  },
  wallets: {
    required: ['id', 'name', 'type', 'balance'],
    types: {
      id: 'string',
      name: 'string',
      type: 'string',
      balance: 'number'
    },
    constraints: {
      name: (value) => value.length > 0 && value.length <= 50,
      type: (value) => ['cash', 'bank', 'credit_card', 'e_wallet'].includes(value)
    }
  },
  transfers: {
    required: ['id', 'fromWallet', 'toWallet', 'amount', 'date'],
    types: {
      id: 'string',
      fromWallet: 'string',
      toWallet: 'string',
      amount: 'number',
      date: 'string'
    },
    constraints: {
      amount: (value) => value > 0,
      date: (value) => !isNaN(Date.parse(value)),
      fromWallet: (value, item) => value !== item.toWallet
    }
  },
  budgets: {
    required: ['id', 'category', 'amount', 'period'],
    types: {
      id: 'string',
      category: 'string',
      amount: 'number',
      period: 'string'
    },
    constraints: {
      amount: (value) => value > 0,
      period: (value) => ['monthly', 'weekly', 'yearly'].includes(value)
    }
  },
  tags: {
    required: ['id', 'name'],
    types: {
      id: 'string',
      name: 'string',
      color: 'string'
    },
    constraints: {
      name: (value) => value.length > 0 && value.length <= 30
    }
  },
  recurring: {
    required: ['id', 'name', 'amount', 'category', 'frequency', 'nextDate'],
    types: {
      id: 'string',
      name: 'string',
      amount: 'number',
      category: 'string',
      frequency: 'string',
      nextDate: 'string'
    },
    constraints: {
      amount: (value) => value > 0,
      frequency: (value) => ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually'].includes(value),
      nextDate: (value) => !isNaN(Date.parse(value))
    }
  }
};

export class DataIntegrityManager {
  constructor(userId = null) {
    this.userId = userId;
    this.validationErrors = [];
    this.integrityIssues = [];
    this.autoFixEnabled = true;
  }

  /**
   * Validate a single item against its schema
   */
  validateItem(type, item) {
    const rules = VALIDATION_RULES[type];
    if (!rules) {
      throw new Error(`No validation rules defined for type: ${type}`);
    }

    const errors = [];

    // Check required fields
    for (const field of rules.required) {
      if (item[field] === undefined || item[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Check types
    for (const [field, expectedType] of Object.entries(rules.types)) {
      if (item[field] !== undefined && item[field] !== null) {
        const actualType = Array.isArray(item[field]) ? 'array' : typeof item[field];
        if (actualType !== expectedType) {
          errors.push(`Field ${field} should be ${expectedType}, got ${actualType}`);
        }
      }
    }

    // Check constraints
    if (rules.constraints) {
      for (const [field, constraint] of Object.entries(rules.constraints)) {
        if (item[field] !== undefined && item[field] !== null) {
          try {
            if (!constraint(item[field], item)) {
              errors.push(`Field ${field} failed constraint validation`);
            }
          } catch (error) {
            errors.push(`Field ${field} constraint check failed: ${error.message}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      item
    };
  }

  /**
   * Validate all items of a specific type
   */
  async validateDataType(type, data = null) {
    const localDB = this.getLocalDB(type);
    const items = data || await localDB.getAll();
    const results = {
      type,
      total: items.length,
      valid: 0,
      invalid: 0,
      errors: []
    };

    for (const item of items) {
      const validation = this.validateItem(type, item);
      if (validation.valid) {
        results.valid++;
      } else {
        results.invalid++;
        results.errors.push({
          id: item.id,
          errors: validation.errors
        });
      }
    }

    return results;
  }

  /**
   * Comprehensive pre-sync validation
   */
  async preSyncValidation() {
    console.log('Starting pre-sync validation...');
    const validationResults = {};
    const types = ['expenses', 'categories', 'wallets', 'transfers', 'budgets', 'tags', 'recurring'];

    for (const type of types) {
      try {
        validationResults[type] = await this.validateDataType(type);
      } catch (error) {
        validationResults[type] = {
          type,
          error: error.message,
          total: 0,
          valid: 0,
          invalid: 0,
          errors: []
        };
      }
    }

    // Check referential integrity
    const integrityResults = await this.checkReferentialIntegrity();
    
    const summary = {
      validation: validationResults,
      integrity: integrityResults,
      overallValid: Object.values(validationResults).every(r => r.invalid === 0) && 
                   integrityResults.issues.length === 0,
      timestamp: new Date().toISOString()
    };

    console.log('Pre-sync validation completed:', summary);
    return summary;
  }

  /**
   * Check referential integrity across all data types
   */
  async checkReferentialIntegrity() {
    const issues = [];
    
    try {
      // Get all active data
      const [expenses, categories, wallets, transfers, budgets, tags, recurring] = await Promise.all([
        localExpenseDB.getAll(),
        localCategoryDB.getAll(),
        localWalletDB.getAll(),
        localTransferDB.getAll(),
        localBudgetDB.getAll(),
        localTagDB.getAll(),
        localRecurringDB.getAll()
      ]);

      // Filter out deleted items
      const activeExpenses = expenses.filter(e => !e.deleted_at);
      const activeCategories = categories.filter(c => !c.deleted_at);
      const activeWallets = wallets.filter(w => !w.deleted_at);
      const activeTransfers = transfers.filter(t => !t.deleted_at);
      const activeBudgets = budgets.filter(b => !b.deleted_at);
      const activeTags = tags.filter(t => !t.deleted_at);
      const activeRecurring = recurring.filter(r => !r.deleted_at);

      // Create lookup sets
      const categoryIds = new Set(activeCategories.map(c => c.id));
      const walletIds = new Set(activeWallets.map(w => w.id));
      const tagIds = new Set(activeTags.map(t => t.id));

      // Check expense references
      for (const expense of activeExpenses) {
        if (!categoryIds.has(expense.category)) {
          issues.push({
            type: 'orphaned_expense_category',
            id: expense.id,
            issue: `Expense references non-existent category: ${expense.category}`,
            severity: 'high',
            autoFixable: true
          });
        }

        if (!walletIds.has(expense.walletId)) {
          issues.push({
            type: 'orphaned_expense_wallet',
            id: expense.id,
            issue: `Expense references non-existent wallet: ${expense.walletId}`,
            severity: 'high',
            autoFixable: true
          });
        }

        // Check tag references
        if (expense.tags && Array.isArray(expense.tags)) {
          for (const tag of expense.tags) {
            if (!tagIds.has(tag)) {
              issues.push({
                type: 'orphaned_expense_tag',
                id: expense.id,
                issue: `Expense references non-existent tag: ${tag}`,
                severity: 'medium',
                autoFixable: true
              });
            }
          }
        }
      }

      // Check transfer references
      for (const transfer of activeTransfers) {
        if (!walletIds.has(transfer.fromWallet)) {
          issues.push({
            type: 'orphaned_transfer_from_wallet',
            id: transfer.id,
            issue: `Transfer references non-existent from wallet: ${transfer.fromWallet}`,
            severity: 'high',
            autoFixable: false
          });
        }

        if (!walletIds.has(transfer.toWallet)) {
          issues.push({
            type: 'orphaned_transfer_to_wallet',
            id: transfer.id,
            issue: `Transfer references non-existent to wallet: ${transfer.toWallet}`,
            severity: 'high',
            autoFixable: false
          });
        }
      }

      // Check budget references
      for (const budget of activeBudgets) {
        if (!categoryIds.has(budget.category)) {
          issues.push({
            type: 'orphaned_budget_category',
            id: budget.id,
            issue: `Budget references non-existent category: ${budget.category}`,
            severity: 'medium',
            autoFixable: true
          });
        }
      }

      // Check recurring transaction references
      for (const recurringTx of activeRecurring) {
        if (!categoryIds.has(recurringTx.category)) {
          issues.push({
            type: 'orphaned_recurring_category',
            id: recurringTx.id,
            issue: `Recurring transaction references non-existent category: ${recurringTx.category}`,
            severity: 'medium',
            autoFixable: true
          });
        }

        if (recurringTx.walletId && !walletIds.has(recurringTx.walletId)) {
          issues.push({
            type: 'orphaned_recurring_wallet',
            id: recurringTx.id,
            issue: `Recurring transaction references non-existent wallet: ${recurringTx.walletId}`,
            severity: 'medium',
            autoFixable: true
          });
        }
      }

      // Check for duplicate IDs within each type
      const checkDuplicates = (items, typeName) => {
        const ids = new Set();
        for (const item of items) {
          if (ids.has(item.id)) {
            issues.push({
              type: 'duplicate_id',
              id: item.id,
              issue: `Duplicate ID found in ${typeName}: ${item.id}`,
              severity: 'critical',
              autoFixable: false
            });
          }
          ids.add(item.id);
        }
      };

      checkDuplicates(activeExpenses, 'expenses');
      checkDuplicates(activeCategories, 'categories');
      checkDuplicates(activeWallets, 'wallets');
      checkDuplicates(activeTransfers, 'transfers');
      checkDuplicates(activeBudgets, 'budgets');
      checkDuplicates(activeTags, 'tags');
      checkDuplicates(activeRecurring, 'recurring');

    } catch (error) {
      issues.push({
        type: 'integrity_check_error',
        issue: `Failed to check referential integrity: ${error.message}`,
        severity: 'critical',
        autoFixable: false
      });
    }

    return {
      issues,
      summary: {
        total: issues.length,
        critical: issues.filter(i => i.severity === 'critical').length,
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length,
        autoFixable: issues.filter(i => i.autoFixable).length
      }
    };
  }

  /**
   * Automatically fix integrity issues where possible
   */
  async autoFixIntegrityIssues(issues) {
    const fixResults = {
      attempted: 0,
      successful: 0,
      failed: 0,
      errors: []
    };

    const autoFixableIssues = issues.filter(issue => issue.autoFixable);
    
    for (const issue of autoFixableIssues) {
      fixResults.attempted++;
      
      try {
        switch (issue.type) {
          case 'orphaned_expense_category':
            await this.fixOrphanedExpenseCategory(issue.id);
            break;
          case 'orphaned_expense_wallet':
            await this.fixOrphanedExpenseWallet(issue.id);
            break;
          case 'orphaned_expense_tag':
            await this.fixOrphanedExpenseTag(issue.id);
            break;
          case 'orphaned_budget_category':
            await this.fixOrphanedBudgetCategory(issue.id);
            break;
          case 'orphaned_recurring_category':
            await this.fixOrphanedRecurringCategory(issue.id);
            break;
          case 'orphaned_recurring_wallet':
            await this.fixOrphanedRecurringWallet(issue.id);
            break;
          default:
            throw new Error(`No auto-fix available for issue type: ${issue.type}`);
        }
        
        fixResults.successful++;
        console.log(`Auto-fixed issue: ${issue.type} for ID ${issue.id}`);
        
      } catch (error) {
        fixResults.failed++;
        fixResults.errors.push({
          issue,
          error: error.message
        });
        console.error(`Failed to auto-fix issue ${issue.type} for ID ${issue.id}:`, error);
      }
    }

    return fixResults;
  }

  /**
   * Auto-fix methods for specific integrity issues
   */
  async fixOrphanedExpenseCategory(expenseId) {
    const expense = await localExpenseDB.getById(expenseId);
    if (expense) {
      // Assign to 'other' category or create it if it doesn't exist
      let otherCategory = await localCategoryDB.getById('other');
      if (!otherCategory) {
        otherCategory = { id: 'other', name: 'Other', color: '#gray' };
        await localCategoryDB.add(otherCategory);
      }
      
      expense.category = 'other';
      expense.last_modified = new Date().toISOString();
      await localExpenseDB.update(expense);
    }
  }

  async fixOrphanedExpenseWallet(expenseId) {
    const expense = await localExpenseDB.getById(expenseId);
    if (expense) {
      // Assign to 'cash' wallet or create it if it doesn't exist
      let cashWallet = await localWalletDB.getById('cash');
      if (!cashWallet) {
        cashWallet = { id: 'cash', name: 'Cash', type: 'cash', balance: 0 };
        await localWalletDB.add(cashWallet);
      }
      
      expense.walletId = 'cash';
      expense.last_modified = new Date().toISOString();
      await localExpenseDB.update(expense);
    }
  }

  async fixOrphanedExpenseTag(expenseId) {
    const expense = await localExpenseDB.getById(expenseId);
    if (expense && expense.tags) {
      // Remove invalid tags
      const validTags = [];
      for (const tag of expense.tags) {
        const tagExists = await localTagDB.getById(tag);
        if (tagExists) {
          validTags.push(tag);
        }
      }
      
      expense.tags = validTags;
      expense.last_modified = new Date().toISOString();
      await localExpenseDB.update(expense);
    }
  }

  async fixOrphanedBudgetCategory(budgetId) {
    const budget = await localBudgetDB.getById(budgetId);
    if (budget) {
      // Assign to 'other' category
      let otherCategory = await localCategoryDB.getById('other');
      if (!otherCategory) {
        otherCategory = { id: 'other', name: 'Other', color: '#gray' };
        await localCategoryDB.add(otherCategory);
      }
      
      budget.category = 'other';
      budget.last_modified = new Date().toISOString();
      await localBudgetDB.update(budget);
    }
  }

  async fixOrphanedRecurringCategory(recurringId) {
    const recurring = await localRecurringDB.getById(recurringId);
    if (recurring) {
      // Assign to 'other' category
      let otherCategory = await localCategoryDB.getById('other');
      if (!otherCategory) {
        otherCategory = { id: 'other', name: 'Other', color: '#gray' };
        await localCategoryDB.add(otherCategory);
      }
      
      recurring.category = 'other';
      recurring.last_modified = new Date().toISOString();
      await localRecurringDB.update(recurring);
    }
  }

  async fixOrphanedRecurringWallet(recurringId) {
    const recurring = await localRecurringDB.getById(recurringId);
    if (recurring) {
      // Assign to 'cash' wallet
      let cashWallet = await localWalletDB.getById('cash');
      if (!cashWallet) {
        cashWallet = { id: 'cash', name: 'Cash', type: 'cash', balance: 0 };
        await localWalletDB.add(cashWallet);
      }
      
      recurring.walletId = 'cash';
      recurring.last_modified = new Date().toISOString();
      await localRecurringDB.update(recurring);
    }
  }

  /**
   * Cleanup old tombstones and optimize database
   */
  async performMaintenance(options = {}) {
    const {
      cleanupTombstonesOlderThan = 30, // days
      validateData = true,
      autoFix = true
    } = options;

    const maintenanceResults = {
      tombstoneCleanup: null,
      validation: null,
      integrity: null,
      autoFix: null,
      timestamp: new Date().toISOString()
    };

    try {
      // Clean up old tombstones
      console.log(`Cleaning up tombstones older than ${cleanupTombstonesOlderThan} days...`);
      maintenanceResults.tombstoneCleanup = await cleanupUtils.cleanupOldTombstones(cleanupTombstonesOlderThan);
      
      if (validateData) {
        // Validate data integrity
        console.log('Performing data validation...');
        const validation = await this.preSyncValidation();
        maintenanceResults.validation = validation.validation;
        maintenanceResults.integrity = validation.integrity;
        
        // Auto-fix issues if enabled
        if (autoFix && validation.integrity.issues.length > 0) {
          console.log('Auto-fixing integrity issues...');
          maintenanceResults.autoFix = await this.autoFixIntegrityIssues(validation.integrity.issues);
        }
      }
      
      console.log('Database maintenance completed:', maintenanceResults);
      return maintenanceResults;
      
    } catch (error) {
      console.error('Database maintenance failed:', error);
      throw new Error(`Maintenance failed: ${error.message}`);
    }
  }

  /**
   * Get database for a specific type
   */
  getLocalDB(type) {
    const dbMap = {
      expenses: localExpenseDB,
      categories: localCategoryDB,
      wallets: localWalletDB,
      transfers: localTransferDB,
      budgets: localBudgetDB,
      tags: localTagDB,
      recurring: localRecurringDB
    };
    
    const db = dbMap[type];
    if (!db) {
      throw new Error(`Unknown database type: ${type}`);
    }
    
    return db;
  }

  /**
   * Get cloud database for a specific type
   */
  getCloudDB(type) {
    const dbMap = {
      expenses: supabaseExpenseDB,
      categories: supabaseCategoryDB,
      wallets: supabaseWalletDB,
      transfers: supabaseTransferDB,
      budgets: supabaseBudgetDB,
      tags: supabaseTagDB,
      recurring: supabaseRecurringDB
    };
    
    const db = dbMap[type];
    if (!db) {
      throw new Error(`Unknown cloud database type: ${type}`);
    }
    
    return db;
  }
}

// Export singleton instance
export const dataIntegrityManager = new DataIntegrityManager();

// Export utility functions
export const validateItem = (type, item) => dataIntegrityManager.validateItem(type, item);
export const preSyncValidation = () => dataIntegrityManager.preSyncValidation();
export const checkReferentialIntegrity = () => dataIntegrityManager.checkReferentialIntegrity();
export const performMaintenance = (options) => dataIntegrityManager.performMaintenance(options); 