import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

// Auth related components
import Login from './components/Login';
import Signup from './components/Signup';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';

// App components (assuming these exist)
import Dashboard from './components/Dashboard';
import Expenses from './components/Expenses';
import WalletPage from './components/WalletPage';
import WalletTransfer from './components/WalletTransfer';
import BudgetManager from './components/BudgetManager';

import { 
  expenseDB as supabaseExpenseDB, 
  categoryDB as supabaseCategoryDB, 
  walletDB as supabaseWalletDB, 
  transferDB as supabaseTransferDB 
} from './supabase-db';

// Create a local implementation of supabaseTagDB
const supabaseTagDB = {
  add: async (tag, userId) => {
    if (!userId) throw new Error('User not authenticated');
    
    try {
      const { data, error } = await supabase
        .from('tags')
        .insert([{ ...tag, user_id: userId }])
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding tag:', error);
      throw error;
    }
  }
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <Expenses />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/wallets"
            element={
              <ProtectedRoute>
                <WalletPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/transfers"
            element={
              <ProtectedRoute>
                <WalletTransfer dbInitialized={true} />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/budget"
            element={
              <ProtectedRoute>
                <BudgetManager />
              </ProtectedRoute>
            }
          />
          
          {/* Default route */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App; 