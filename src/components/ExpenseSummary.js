import React from 'react';

function ExpenseSummary({ expenses, total }) {
  // Calculate totals
  const totalIncome = expenses
    .filter(expense => expense.isIncome)
    .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    
  const totalExpenses = expenses
    .filter(expense => !expense.isIncome)
    .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    
  const netCashFlow = totalIncome - totalExpenses;
  
  // Calculate highest expense
  const highestExpense = expenses.length > 0
    ? Math.max(...expenses.filter(expense => !expense.isIncome).map(expense => expense.amount), 0)
    : 0;
    
  // Calculate highest income
  const highestIncome = expenses.length > 0
    ? Math.max(...expenses.filter(expense => expense.isIncome).map(expense => expense.amount), 0) 
    : 0;
  
  // Calculate average transaction
  const averageTransaction = expenses.length > 0
    ? total / expenses.length
    : 0;
  
  // Format number as Indonesian Rupiah
  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID').format(amount);
  };
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
        <div className="text-sm text-gray-400 mb-1">Income</div>
        <div className="text-xl font-semibold text-green-400">Rp {formatRupiah(totalIncome)}</div>
      </div>
      
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
        <div className="text-sm text-gray-400 mb-1">Expenses</div>
        <div className="text-xl font-semibold text-red-400">Rp {formatRupiah(totalExpenses)}</div>
      </div>
      
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
        <div className="text-sm text-gray-400 mb-1">Net Cash Flow</div>
        <div className={`text-xl font-semibold ${netCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          Rp {formatRupiah(Math.abs(netCashFlow))}
          <span className="text-xs ml-1">{netCashFlow >= 0 ? '(+)' : '(-)'}</span>
        </div>
      </div>
      
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
        <div className="text-sm text-gray-400 mb-1">Transaction Count</div>
        <div className="text-xl font-semibold text-indigo-400">{expenses.length}</div>
        <div className="text-xs text-gray-500 mt-1">
          {expenses.filter(e => e.isIncome).length} income / {expenses.filter(e => !e.isIncome).length} expense
        </div>
      </div>
    </div>
  );
}

export default ExpenseSummary;