/**
 * Duplicate Detection Utility
 * Helps prevent duplicate transactions during sync operations
 */

export class DuplicateDetector {
  /**
   * Check if two transactions are likely duplicates
   * @param {Object} transaction1 
   * @param {Object} transaction2 
   * @returns {Object} { isDuplicate: boolean, confidence: number, reasons: string[] }
   */
  static detectDuplicate(transaction1, transaction2) {
    if (!transaction1 || !transaction2) {
      return { isDuplicate: false, confidence: 0, reasons: [] };
    }

    const reasons = [];
    let score = 0;
    const maxScore = 100;

    // 1. Exact ID match (100% duplicate)
    if (transaction1.id === transaction2.id) {
      return { 
        isDuplicate: true, 
        confidence: 100, 
        reasons: ['Identical transaction ID'] 
      };
    }

    // 2. Amount match (35 points - increased weight)
    if (Math.abs(parseFloat(transaction1.amount) - parseFloat(transaction2.amount)) < 0.01) {
      score += 35;
      reasons.push('Same amount');
    }

    // 3. Description/name match (30 points - increased weight)
    const desc1 = (transaction1.description || transaction1.name || '').toLowerCase().trim();
    const desc2 = (transaction2.description || transaction2.name || '').toLowerCase().trim();
    
    if (desc1 && desc2) {
      if (desc1 === desc2) {
        score += 30;
        reasons.push('Identical description');
      } else if (this.calculateSimilarity(desc1, desc2) > 0.8) {
        score += 20;
        reasons.push('Very similar description');
      } else if (this.calculateSimilarity(desc1, desc2) > 0.6) {
        score += 10;
        reasons.push('Similar description');
      }
    }

    // 4. Date proximity (25 points for same day, 15 for within 24 hours, 5 for within 48 hours)
    const date1 = new Date(transaction1.date);
    const date2 = new Date(transaction2.date);
    const timeDiff = Math.abs(date1.getTime() - date2.getTime());
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (this.isSameDay(date1, date2)) {
      score += 25;
      reasons.push('Same date');
    } else if (hoursDiff <= 24) {
      score += 15;
      reasons.push('Within 24 hours');
    } else if (hoursDiff <= 48) {
      score += 5;
      reasons.push('Within 48 hours');
    }

    // 5. Category match (10 points)
    if (transaction1.category === transaction2.category && transaction1.category) {
      score += 10;
      reasons.push('Same category');
    }

    // 6. Wallet match (10 points)
    const wallet1 = transaction1.wallet_id || transaction1.walletId;
    const wallet2 = transaction2.wallet_id || transaction2.walletId;
    if (wallet1 === wallet2 && wallet1) {
      score += 10;
      reasons.push('Same wallet');
    }

    // 7. Income/expense type match (5 points)
    const isIncome1 = transaction1.is_income || transaction1.isIncome;
    const isIncome2 = transaction2.is_income || transaction2.isIncome;
    if (isIncome1 === isIncome2) {
      score += 5;
      reasons.push('Same transaction type');
    }

    // 8. Notes similarity (5 points)
    const notes1 = (transaction1.notes || '').toLowerCase().trim();
    const notes2 = (transaction2.notes || '').toLowerCase().trim();
    if (notes1 && notes2 && notes1 === notes2) {
      score += 5;
      reasons.push('Identical notes');
    }

    // 9. Time-based duplicate detection (additional scoring for very recent transactions)
    const created1 = new Date(transaction1.created_at || transaction1.date);
    const created2 = new Date(transaction2.created_at || transaction2.date);
    const creationTimeDiff = Math.abs(created1.getTime() - created2.getTime());
    const creationMinutesDiff = creationTimeDiff / (1000 * 60);

    if (creationMinutesDiff <= 5) {
      score += 15;
      reasons.push('Created within 5 minutes');
    } else if (creationMinutesDiff <= 30) {
      score += 10;
      reasons.push('Created within 30 minutes');
    }

    const confidence = Math.min(score, maxScore);
    const isDuplicate = confidence >= 65; // Lowered threshold for more aggressive detection

    return {
      isDuplicate,
      confidence,
      reasons,
      score
    };
  }

  /**
   * Find potential duplicates in a list of transactions
   * @param {Array} transactions 
   * @returns {Array} Array of duplicate groups
   */
  static findDuplicates(transactions) {
    const duplicateGroups = [];
    const processed = new Set();

    for (let i = 0; i < transactions.length; i++) {
      if (processed.has(i)) continue;

      const currentTransaction = transactions[i];
      const duplicates = [currentTransaction];

      for (let j = i + 1; j < transactions.length; j++) {
        if (processed.has(j)) continue;

        const otherTransaction = transactions[j];
        const result = this.detectDuplicate(currentTransaction, otherTransaction);

        if (result.isDuplicate) {
          duplicates.push(otherTransaction);
          processed.add(j);
        }
      }

      if (duplicates.length > 1) {
        duplicateGroups.push({
          transactions: duplicates,
          count: duplicates.length
        });
      }

      processed.add(i);
    }

    return duplicateGroups;
  }

  /**
   * Remove duplicates from a transaction list, keeping the most recent
   * @param {Array} transactions 
   * @returns {Array} Deduplicated transactions
   */
  static removeDuplicates(transactions) {
    const duplicateGroups = this.findDuplicates(transactions);
    const toRemove = new Set();

    duplicateGroups.forEach(group => {
      // Sort by last_modified or created_at, keep the most recent
      const sorted = group.transactions.sort((a, b) => {
        const dateA = new Date(a.last_modified || a.updated_at || a.created_at || a.date);
        const dateB = new Date(b.last_modified || b.updated_at || b.created_at || b.date);
        return dateB.getTime() - dateA.getTime();
      });

      // Mark all but the first (most recent) for removal
      for (let i = 1; i < sorted.length; i++) {
        toRemove.add(sorted[i].id);
      }
    });

    return transactions.filter(transaction => !toRemove.has(transaction.id));
  }

  /**
   * Calculate string similarity using Levenshtein distance
   * @param {string} str1 
   * @param {string} str2 
   * @returns {number} Similarity ratio (0-1)
   */
  static calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 
   * @param {string} str2 
   * @returns {number} Edit distance
   */
  static levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Check if two dates are on the same day
   * @param {Date} date1 
   * @param {Date} date2 
   * @returns {boolean}
   */
  static isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  /**
   * Generate a fingerprint for a transaction to help with duplicate detection
   * @param {Object} transaction 
   * @returns {string} Transaction fingerprint
   */
  static generateFingerprint(transaction) {
    const amount = parseFloat(transaction.amount || 0).toFixed(2);
    const description = (transaction.description || transaction.name || '').toLowerCase().trim();
    const date = new Date(transaction.date).toISOString().split('T')[0]; // YYYY-MM-DD
    const wallet = transaction.wallet_id || transaction.walletId || '';
    const type = transaction.is_income || transaction.isIncome ? 'income' : 'expense';
    
    return `${amount}-${description}-${date}-${wallet}-${type}`;
  }

  /**
   * Check for potential duplicates before adding a new transaction
   * @param {Object} newTransaction 
   * @param {Array} existingTransactions 
   * @param {Array} recentlyDeletedTransactions - Optional array of recently deleted transactions
   * @returns {Object} { hasDuplicates: boolean, duplicates: Array, suggestions: Array, deletedDuplicates: Array }
   */
  static checkBeforeAdd(newTransaction, existingTransactions, recentlyDeletedTransactions = []) {
    const duplicates = [];
    const suggestions = [];
    const deletedDuplicates = [];

    // Check against existing active transactions
    existingTransactions.forEach(existing => {
      const result = this.detectDuplicate(newTransaction, existing);
      
      if (result.isDuplicate) {
        duplicates.push({
          transaction: existing,
          ...result
        });
      } else if (result.confidence > 40) {
        suggestions.push({
          transaction: existing,
          ...result
        });
      }
    });

    // Check against recently deleted transactions (within last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    recentlyDeletedTransactions.forEach(deleted => {
      if (deleted.deleted_at && new Date(deleted.deleted_at) > sevenDaysAgo) {
        const result = this.detectDuplicate(newTransaction, deleted);
        
        if (result.isDuplicate) {
          deletedDuplicates.push({
            transaction: deleted,
            deletedAt: deleted.deleted_at,
            ...result
          });
        }
      }
    });

    return {
      hasDuplicates: duplicates.length > 0,
      duplicates,
      suggestions,
      deletedDuplicates,
      hasDeletedDuplicates: deletedDuplicates.length > 0
    };
  }

  /**
   * Check if a transaction matches recently deleted duplicates
   * @param {Object} transaction 
   * @param {Array} recentlyDeletedTransactions 
   * @returns {Object} { isRestoringDeleted: boolean, matches: Array }
   */
  static checkAgainstRecentlyDeleted(transaction, recentlyDeletedTransactions) {
    const matches = [];
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    recentlyDeletedTransactions.forEach(deleted => {
      if (deleted.deleted_at && new Date(deleted.deleted_at) > oneDayAgo) {
        const result = this.detectDuplicate(transaction, deleted);
        
        if (result.isDuplicate) {
          matches.push({
            deletedTransaction: deleted,
            deletedAt: deleted.deleted_at,
            ...result
          });
        }
      }
    });

    return {
      isRestoringDeleted: matches.length > 0,
      matches
    };
  }
}

export default DuplicateDetector; 