import { recurringDB, expenseDB, walletDB } from './db';

// Process recurring transactions that are due
export const processRecurringTransactions = async () => {
  try {
    // Get all transactions due today or earlier
    const dueTransactions = await recurringDB.getDueTransactions();
    
    if (dueTransactions.length === 0) {
      return { processed: 0 };
    }
    
    let processedCount = 0;
    
    // Process each due transaction
    for (const transaction of dueTransactions) {
      // Create a new transaction from the recurring template
      const newTransaction = {
        id: Date.now() + processedCount, // Ensure unique ID
        name: transaction.name,
        amount: transaction.amount,
        category: transaction.category,
        tags: [...transaction.tags, 'recurring'], // Add the recurring tag
        walletId: transaction.walletId,
        isIncome: transaction.isIncome,
        notes: transaction.notes || '',
        date: new Date().toISOString().slice(0, 10), // Today's date
      };
      
      // Add the transaction
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
      
      // Calculate next occurrence date based on frequency
      const nextDate = calculateNextDate(transaction.frequency, new Date());
      
      // Update the recurring transaction with the new next date
      await recurringDB.update({
        ...transaction,
        nextDate: nextDate
      });
      
      processedCount++;
    }
    
    // Return success with count of processed transactions
    return { 
      processed: processedCount,
      transactions: dueTransactions 
    };
  } catch (error) {
    console.error('Error processing recurring transactions:', error);
    return { error: error.message };
  }
};

// Helper function to calculate the next date based on frequency
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