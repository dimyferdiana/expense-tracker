import { 
  recurringDB as supabaseRecurringDB, 
  expenseDB as supabaseExpenseDB, 
  walletDB as supabaseWalletDB 
} from './supabase-db';

// Process recurring transactions that are due
export const processRecurringTransactions = async (userId) => {
  if (!userId) {
    console.error('Cannot process recurring transactions without user ID');
    return { error: 'No user authentication' };
  }
  
  try {
    // Get all transactions due today or earlier
    const dueTransactions = await supabaseRecurringDB.getDueTransactions(userId);
    
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
        wallet_id: transaction.walletId,
        is_income: transaction.isIncome,
        notes: transaction.notes || '',
        date: new Date().toISOString().slice(0, 10), // Today's date
      };
      
      // Add the transaction
      await supabaseExpenseDB.add(newTransaction, userId);
      
      // Update wallet balance
      try {
        const wallets = await supabaseWalletDB.getAll(userId);
        const wallet = wallets.find(w => w.id === newTransaction.wallet_id);
        
        if (wallet) {
          // For income add to balance, for expense subtract
          const adjustment = newTransaction.is_income ? 
            parseFloat(newTransaction.amount) : 
            -parseFloat(newTransaction.amount);
            
          wallet.balance = parseFloat(wallet.balance) + adjustment;
          await supabaseWalletDB.update(wallet, userId);
        }
      } catch (walletError) {
        console.error('Error updating wallet balance:', walletError);
      }
      
      // Calculate next occurrence date based on frequency
      const nextDate = calculateNextDate(transaction.frequency, new Date());
      
      // Update the recurring transaction with the new next date
      await supabaseRecurringDB.update({
        ...transaction,
        nextDate: nextDate
      }, userId);
      
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