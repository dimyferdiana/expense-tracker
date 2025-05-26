// Wallet Repair Utility
// Use this in browser console to fix wallet balance issues

import { createWalletOperations } from './walletOperations';
import { walletDB as supabaseWalletDB } from './supabase-db';

/**
 * Wallet Repair Utilities
 * Run these functions in browser console to fix wallet issues
 */
export class WalletRepair {
  static async getCurrentUser() {
    // Try to get user from various sources
    if (window.user) return window.user;
    if (window.globalUser) return window.globalUser;
    
    // Try to get from localStorage
    const authData = localStorage.getItem('supabase.auth.token') || 
                    localStorage.getItem('sb-mplrakcyrohgkqdhzpry-auth-token');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        return parsed.user || parsed;
      } catch (e) {
        console.error('Error parsing auth data:', e);
      }
    }
    
    throw new Error('User not found. Please make sure you are logged in.');
  }

  /**
   * List all wallets with their current balances
   */
  static async listWallets() {
    try {
      const user = await this.getCurrentUser();
      const wallets = await supabaseWalletDB.getAll(user.id);
      
      console.log('💰 Current Wallets:');
      console.table(wallets.map(w => ({
        ID: w.id,
        Name: w.name,
        Type: w.type,
        Balance: parseFloat(w.balance).toFixed(2),
        'Balance Status': w.balance < 0 ? '❌ Negative' : '✅ Positive'
      })));
      
      return wallets;
    } catch (error) {
      console.error('Error listing wallets:', error);
      throw error;
    }
  }

  /**
   * Fix a specific wallet balance by setting it to a new value
   */
  static async fixWalletBalance(walletId, newBalance) {
    try {
      const user = await this.getCurrentUser();
      const walletOps = createWalletOperations(user);
      
      console.log(`🔧 Fixing wallet ${walletId} balance to ${newBalance}...`);
      
      const result = await walletOps.correctWalletBalance(
        walletId, 
        newBalance, 
        'Manual fix via WalletRepair utility'
      );
      
      console.log('✅ Wallet balance fixed successfully!');
      console.log('📊 Result:', {
        walletName: result.wallet.name,
        oldBalance: result.oldBalance.toFixed(2),
        newBalance: result.newBalance.toFixed(2),
        adjustment: result.adjustment.toFixed(2)
      });
      
      return result;
    } catch (error) {
      console.error('❌ Error fixing wallet balance:', error);
      throw error;
    }
  }

  /**
   * Recalculate wallet balance from all transactions
   */
  static async recalculateWalletBalance(walletId) {
    try {
      const user = await this.getCurrentUser();
      const walletOps = createWalletOperations(user);
      
      console.log(`📊 Recalculating wallet ${walletId} balance from transactions...`);
      
      const result = await walletOps.recalculateWalletBalance(walletId);
      
      console.log('✅ Wallet balance recalculated!');
      console.log('📊 Result:', {
        walletName: result.wallet.name,
        oldBalance: result.oldBalance.toFixed(2),
        calculatedBalance: result.newBalance.toFixed(2),
        difference: result.difference.toFixed(2),
        transactionCounts: result.transactionCounts
      });
      
      return result;
    } catch (error) {
      console.error('❌ Error recalculating wallet balance:', error);
      throw error;
    }
  }

  /**
   * Emergency fix: Set all negative wallet balances to zero
   */
  static async fixAllNegativeBalances() {
    try {
      const user = await this.getCurrentUser();
      const wallets = await supabaseWalletDB.getAll(user.id);
      const negativeWallets = wallets.filter(w => w.balance < 0);
      
      if (negativeWallets.length === 0) {
        console.log('✅ No negative wallet balances found!');
        return [];
      }
      
      console.log(`🚨 Found ${negativeWallets.length} wallets with negative balances:`);
      negativeWallets.forEach(w => {
        console.log(`  - ${w.name}: ${w.balance.toFixed(2)}`);
      });
      
      const confirm = window.confirm(
        `Fix ${negativeWallets.length} negative wallet balances by setting them to 0?`
      );
      
      if (!confirm) {
        console.log('❌ Operation cancelled by user');
        return [];
      }
      
      const walletOps = createWalletOperations(user);
      const results = [];
      
      for (const wallet of negativeWallets) {
        try {
          const result = await walletOps.correctWalletBalance(
            wallet.id, 
            0, 
            'Emergency fix: negative balance reset to zero'
          );
          results.push(result);
          console.log(`✅ Fixed ${wallet.name}: ${wallet.balance.toFixed(2)} → 0.00`);
        } catch (error) {
          console.error(`❌ Failed to fix ${wallet.name}:`, error);
        }
      }
      
      console.log(`🎉 Fixed ${results.length} out of ${negativeWallets.length} wallets!`);
      return results;
    } catch (error) {
      console.error('❌ Error fixing negative balances:', error);
      throw error;
    }
  }

  /**
   * Find the wallet causing the current error
   */
  static async findProblematicWallet() {
    try {
      const wallets = await this.listWallets();
      const problematic = wallets.filter(w => w.balance < 0);
      
      if (problematic.length === 0) {
        console.log('✅ No problematic wallets found!');
        return [];
      }
      
      console.log('🚨 Problematic wallets (negative balance):');
      problematic.forEach(w => {
        console.log(`  - ${w.name} (ID: ${w.id}): ${w.balance.toFixed(2)}`);
      });
      
      return problematic;
    } catch (error) {
      console.error('Error finding problematic wallets:', error);
      throw error;
    }
  }

  /**
   * Quick fix for the BCA wallet specifically mentioned in the error
   */
  static async fixBCAWallet() {
    try {
      const wallets = await this.listWallets();
      const bcaWallet = wallets.find(w => w.name.toLowerCase().includes('bca'));
      
      if (!bcaWallet) {
        console.log('❌ BCA wallet not found');
        return null;
      }
      
      console.log(`Found BCA wallet: ${bcaWallet.name} with balance ${bcaWallet.balance.toFixed(2)}`);
      
      if (bcaWallet.balance >= 0) {
        console.log('✅ BCA wallet balance is already positive!');
        return bcaWallet;
      }
      
      const newBalance = window.prompt(
        `BCA wallet has negative balance: ${bcaWallet.balance.toFixed(2)}\n` +
        'Enter new balance (or 0 to reset):',
        '0'
      );
      
      if (newBalance === null) {
        console.log('❌ Operation cancelled');
        return null;
      }
      
      const balance = parseFloat(newBalance) || 0;
      return await this.fixWalletBalance(bcaWallet.id, balance);
    } catch (error) {
      console.error('Error fixing BCA wallet:', error);
      throw error;
    }
  }
}

// Make it available globally for console use
if (typeof window !== 'undefined') {
  window.WalletRepair = WalletRepair;
}

export default WalletRepair; 