import React, { useState, useEffect } from 'react';
import { walletDB as supabaseWalletDB } from '../utils/supabase-db';
import { useAuth } from '../contexts/AuthContext';

// Function to format rupiah
const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID').format(number);
};

function WalletSummary({ dbInitialized = false, refresh = 0 }) {
  const [wallets, setWallets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    loadWallets();
  }, [dbInitialized, refresh, user]);

  const loadWallets = async () => {
    setIsLoading(true);
    try {
      let data = [];
      
      // Get wallets from Supabase if user is authenticated
      if (dbInitialized && user) {
        data = await supabaseWalletDB.getAll(user.id);
      } else {
        // Fall back to localStorage
        data = JSON.parse(localStorage.getItem('wallets') || '[]');
      }
      
      setWallets(data);
      
      // Calculate total balance
      const total = data.reduce((sum, wallet) => sum + parseFloat(wallet.balance || 0), 0);
      setTotalBalance(total);
    } catch (e) {
      console.error('Error loading wallets:', e);
      setWallets([]);
      setTotalBalance(0);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get color for balance display
  const getBalanceColor = (balance) => {
    if (balance > 0) return 'text-green-400';
    if (balance < 0) return 'text-red-400';
    return 'text-gray-400';
  };
  
  // Get icon based on wallet type
  const getWalletIcon = (type) => {
    switch(type) {
      case 'cash':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
        );
      case 'bank':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.496 2.132a1 1 0 00-.992 0l-7 4A1 1 0 003 8v7a1 1 0 001 1h12a1 1 0 001-1V8a1 1 0 00.496-1.868l-7-4zM6 9a1 1 0 00-1 1v3a1 1 0 102 0v-3a1 1 0 00-1-1zm3 1a1 1 0 012 0v3a1 1 0 11-2 0v-3zm5-1a1 1 0 00-1 1v3a1 1 0 102 0v-3a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'credit_card':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
            <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
          </svg>
        );
      case 'e_wallet':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-20 bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-xl font-semibold mb-4 text-indigo-300">Wallet Balances</h2>
        <p className="text-gray-400">No wallets found. Go to the Wallets tab to add one!</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-4 mt-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-indigo-300">Wallet Balances</h2>
        <div className={`text-xl font-bold ${getBalanceColor(totalBalance)}`}>
          Rp {formatRupiah(totalBalance)}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {wallets.map(wallet => (
          <div key={wallet.id} className="flex items-center p-3 bg-gray-700 rounded-lg">
            <div className="text-indigo-400 mr-3">
              {getWalletIcon(wallet.type)}
            </div>
            <div className="flex-grow">
              <div className="font-medium text-white">{wallet.name}</div>
              <div className="text-xs text-gray-400">
                {wallet.type === 'bank' ? 'Bank Account' : 
                 wallet.type === 'credit_card' ? 'Credit Card' : 
                 wallet.type === 'e_wallet' ? 'E-Wallet' : 'Cash'}
              </div>
            </div>
            <div className={`text-lg font-semibold ${getBalanceColor(wallet.balance)}`}>
              Rp {formatRupiah(wallet.balance)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WalletSummary; 