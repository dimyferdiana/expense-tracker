import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { getColorName } from '../utils/colors';

ChartJS.register(ArcElement, Tooltip, Legend);

function ExpenseChart({ expenses, categories = [] }) {
  // Convert color names to Chart.js-compatible RGBA values
  const colorToRGBA = (colorName, alpha = 0.8) => {
    const colorMap = {
      blue: '54, 162, 235',
      green: '75, 192, 192',
      yellow: '255, 206, 86',
      indigo: '153, 102, 255',
      purple: '153, 102, 255',
      pink: '255, 99, 132',
      lime: '201, 203, 207',
      rose: '255, 99, 132',
      teal: '75, 192, 192',
      cyan: '54, 162, 235',
      orange: '255, 159, 64',
      gray: '201, 203, 207',
      red: '255, 99, 132'
    };
    
    const rgb = colorMap[colorName] || colorMap.gray;
    return `rgba(${rgb}, ${alpha})`;
  };

  // Helper function to get category info by ID
  const getCategoryInfo = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (category) {
      return {
        name: category.name,
        color: getColorName(category.color) || 'gray'
      };
    }
    // Fallback for categories not found in the database
    return {
      name: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
      color: 'gray'
    };
  };

  // Separate expenses and income
  const expenseTransactions = expenses.filter(expense => !expense.is_income);
  const incomeTransactions = expenses.filter(expense => expense.is_income);

  // Group expenses by category
  const expensesByCategory = expenseTransactions.reduce((acc, expense) => {
    const { category, amount } = expense;
    acc[category] = (acc[category] || 0) + amount;
    return acc;
  }, {});

  // Group income by category
  const incomeByCategory = incomeTransactions.reduce((acc, income) => {
    const { category, amount } = income;
    acc[category] = (acc[category] || 0) + amount;
    return acc;
  }, {});

  // Helper function to create chart data
  const createChartData = (dataByCategory) => {
    const chartLabels = [];
    const chartData = [];
    const chartColors = [];

    Object.keys(dataByCategory).forEach(categoryId => {
      const categoryInfo = getCategoryInfo(categoryId);
      chartLabels.push(categoryInfo.name);
      chartData.push(dataByCategory[categoryId]);
      chartColors.push(colorToRGBA(categoryInfo.color));
    });

    return {
      labels: chartLabels,
      datasets: [
        {
          data: chartData,
          backgroundColor: chartColors,
          borderColor: chartColors.map(color => color.replace('0.8', '1')), // More opaque borders
          borderWidth: 2,
          hoverBackgroundColor: chartColors.map(color => color.replace('0.8', '0.9')), // Slightly more opaque on hover
          hoverBorderWidth: 3,
        },
      ],
    };
  };

  // Chart options
  const getChartOptions = (isIncome = false) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#D1D5DB', // text-gray-300
          padding: 20,
          font: {
            size: 12
          },
          usePointStyle: true,
          pointStyle: 'circle',
        }
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(31, 41, 55, 0.9)', // gray-800 with opacity
        titleColor: '#F3F4F6', // gray-100
        bodyColor: '#D1D5DB', // gray-300
        borderColor: '#6B7280', // gray-500
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
            const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
            const prefix = isIncome ? '+' : '-';
            return `${context.label}: ${prefix} Rp ${new Intl.NumberFormat('id-ID').format(context.raw)} (${percentage}%)`;
          }
        }
      }
    },
    layout: {
      padding: {
        top: 10,
        bottom: 10
      }
    }
  });

  // Don't render if no expenses or income at all
  if (expenses.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      {/* Grid Container - 2 columns on desktop, 1 on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Expenses Chart */}
        {Object.keys(expensesByCategory).length > 0 && (
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex items-center mb-4">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
              <h2 className="text-xl font-semibold text-red-300">Expenses by Category</h2>
            </div>
            <div style={{ height: '350px' }}>
              <Pie data={createChartData(expensesByCategory)} options={getChartOptions(false)} />
            </div>
          </div>
        )}
  
        {/* Income Chart */}
        {Object.keys(incomeByCategory).length > 0 && (
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex items-center mb-4">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <h2 className="text-xl font-semibold text-green-300">Income by Category</h2>
            </div>
            <div style={{ height: '350px' }}>
              <Pie data={createChartData(incomeByCategory)} options={getChartOptions(true)} />
            </div>
          </div>
        )}
      </div>
  
      {/* No Data Message */}
      {Object.keys(expensesByCategory).length === 0 && Object.keys(incomeByCategory).length === 0 && (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">Transaction Breakdown</h2>
          <p className="text-gray-400">No transactions to display. Start adding some expenses or income!</p>
        </div>
      )}
    </div>
  );
}

export default ExpenseChart; 