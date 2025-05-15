import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

function ExpenseChart({ expenses }) {
  // Define colors for different categories
  const categoryColors = {
    food: 'rgba(255, 99, 132, 0.7)',
    transportation: 'rgba(54, 162, 235, 0.7)',
    entertainment: 'rgba(255, 206, 86, 0.7)',
    utilities: 'rgba(75, 192, 192, 0.7)',
    housing: 'rgba(153, 102, 255, 0.7)',
    healthcare: 'rgba(255, 159, 64, 0.7)',
    other: 'rgba(201, 203, 207, 0.7)'
  };

  // Helper function to capitalize category
  const formatCategory = (category) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  // Group expenses by category
  const expensesByCategory = expenses.reduce((acc, expense) => {
    const { category, amount } = expense;
    acc[category] = (acc[category] || 0) + amount;
    return acc;
  }, {});

  // Prepare data for chart
  const chartData = {
    labels: Object.keys(expensesByCategory).map(category => formatCategory(category)),
    datasets: [
      {
        data: Object.values(expensesByCategory),
        backgroundColor: Object.keys(expensesByCategory).map(category => categoryColors[category]),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#D1D5DB' // text-gray-300
        }
      },
      title: {
        display: false,
      },
    },
  };

  if (expenses.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-6">
      <h2 className="text-xl font-semibold mb-4 text-indigo-300">Expense Breakdown</h2>
      <Pie data={chartData} options={options} />
    </div>
  );
}

export default ExpenseChart; 