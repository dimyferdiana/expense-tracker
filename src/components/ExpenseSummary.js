import React from 'react';
import { WalletUtils } from '../utils/walletOperations';

function ExpenseSummary({ expenses = [], total = 0 }) {
  // Calculate income and expense totals with safe decimal arithmetic
  const totalIncome = expenses
    .filter(expense => expense.is_income)
    .reduce((sum, expense) => WalletUtils.addToBalance(sum, expense.amount), 0);
    
  const totalExpenses = expenses
    .filter(expense => !expense.is_income)
    .reduce((sum, expense) => WalletUtils.addToBalance(sum, expense.amount), 0);
    
  const netCashFlow = WalletUtils.subtractFromBalance(totalIncome, totalExpenses);
  
  // Find highest expense and income with safe comparisons
  const expenseAmounts = expenses
    .filter(expense => !expense.is_income)
    .map(expense => parseFloat(expense.amount || 0));
  const highestExpense = expenseAmounts.length > 0 ? Math.max(...expenseAmounts) : 0;
    
  const incomeAmounts = expenses
    .filter(expense => expense.is_income)
    .map(expense => parseFloat(expense.amount || 0));
  const highestIncome = incomeAmounts.length > 0 ? Math.max(...incomeAmounts) : 0;
  
  // Calculate average transaction with safe division
  const averageTransaction = expenses.length > 0
    ? parseFloat(total) / expenses.length
    : 0;
  
  // Format number with proper precision
  const formatRupiah = (amount) => {
    return WalletUtils.formatBalance(amount);
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <h3 className="text-lg font-medium text-gray-300 mb-4">Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Total Income:</span>
            <span className="text-green-400">Rp {formatRupiah(totalIncome)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Total Expenses:</span>
            <span className="text-red-400">Rp {formatRupiah(totalExpenses)}</span>
          </div>
          <div className="border-t border-gray-700 my-2 pt-2">
            <div className="flex justify-between items-center font-medium">
              <span className="text-gray-300">Net Cash Flow:</span>
              <span className={netCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}>
                Rp {formatRupiah(Math.abs(netCashFlow))}
                {netCashFlow >= 0 ? ' ↑' : ' ↓'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <h3 className="text-lg font-medium text-gray-300 mb-4">Highest Values</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Highest Income:</span>
            <span className="text-green-400">Rp {formatRupiah(highestIncome)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Highest Expense:</span>
            <span className="text-red-400">Rp {formatRupiah(highestExpense)}</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <h3 className="text-lg font-medium text-gray-300 mb-4">Transaction Count</h3>
        <div className="text-gray-400">
          {expenses.filter(e => e.is_income).length} income / {expenses.filter(e => !e.is_income).length} expense
        </div>
      </div>
    </div>
  );
}

export default ExpenseSummary;