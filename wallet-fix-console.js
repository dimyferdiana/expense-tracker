// Wallet Fix Console Script
// Copy and paste this entire script into your browser console to fix wallet balance issues

(async function() {
  console.log('🔧 Wallet Balance Fix Utility');
  console.log('==============================');
  
  // Helper function to get current user
  const getCurrentUser = () => {
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
  };

  // Helper function to get wallets
  const getWallets = async (userId) => {
    const response = await fetch('/api/wallets', {
      headers: { 'Authorization': `Bearer ${userId}` }
    });
    if (!response.ok) {
      // Fallback to direct Supabase call if API not available
      if (window.supabase) {
        const { data, error } = await window.supabase
          .from('wallets')
          .select('*')
          .eq('user_id', userId);
        if (error) throw error;
        return data;
      }
      throw new Error('Cannot access wallets');
    }
    return await response.json();
  };

  // Helper function to update wallet
  const updateWallet = async (wallet, userId) => {
    if (window.supabase) {
      const { data, error } = await window.supabase
        .from('wallets')
        .update(wallet)
        .eq('id', wallet.id)
        .eq('user_id', userId);
      if (error) throw error;
      return data;
    }
    throw new Error('Supabase not available');
  };

  try {
    // Get current user
    const user = getCurrentUser();
    console.log('✅ User found:', user.email || user.id);

    // Get all wallets
    let wallets;
    try {
      wallets = await getWallets(user.id);
    } catch (e) {
      console.log('API call failed, trying direct access...');
      // Try direct access to global variables
      if (window.supabase) {
        const { data, error } = await window.supabase
          .from('wallets')
          .select('*')
          .eq('user_id', user.id);
        if (error) throw error;
        wallets = data;
      } else {
        throw new Error('Cannot access wallets - Supabase not available');
      }
    }

    console.log('💰 Current Wallets:');
    console.table(wallets.map(w => ({
      ID: w.id,
      Name: w.name,
      Balance: parseFloat(w.balance).toFixed(2),
      Status: w.balance < 0 ? '❌ NEGATIVE' : '✅ Positive'
    })));

    // Find problematic wallets
    const negativeWallets = wallets.filter(w => w.balance < 0);
    
    if (negativeWallets.length === 0) {
      console.log('✅ No negative wallet balances found! Your wallets are healthy.');
      return;
    }

    console.log(`🚨 Found ${negativeWallets.length} wallets with negative balances:`);
    negativeWallets.forEach(w => {
      console.log(`  - ${w.name}: ${w.balance.toFixed(2)}`);
    });

    // Quick fix options
    console.log('\n🔧 Quick Fix Options:');
    console.log('1. Fix all negative balances to 0');
    console.log('2. Fix specific wallet');
    console.log('3. Set custom balance for a wallet');

    // Option 1: Fix all to zero
    window.fixAllNegativeWallets = async () => {
      console.log('🔧 Fixing all negative wallet balances to 0...');
      
      for (const wallet of negativeWallets) {
        try {
          const updatedWallet = { ...wallet, balance: 0 };
          await updateWallet(updatedWallet, user.id);
          console.log(`✅ Fixed ${wallet.name}: ${wallet.balance.toFixed(2)} → 0.00`);
        } catch (error) {
          console.error(`❌ Failed to fix ${wallet.name}:`, error);
        }
      }
      
      console.log('🎉 All negative balances fixed! You can now add expenses.');
      console.log('💡 Refresh the page to see the changes.');
    };

    // Option 2: Fix specific wallet
    window.fixWallet = async (walletId, newBalance) => {
      const wallet = wallets.find(w => w.id === walletId);
      if (!wallet) {
        console.error('❌ Wallet not found');
        return;
      }
      
      try {
        const updatedWallet = { ...wallet, balance: parseFloat(newBalance) };
        await updateWallet(updatedWallet, user.id);
        console.log(`✅ Fixed ${wallet.name}: ${wallet.balance.toFixed(2)} → ${newBalance}`);
        console.log('💡 Refresh the page to see the changes.');
      } catch (error) {
        console.error(`❌ Failed to fix ${wallet.name}:`, error);
      }
    };

    // Option 3: Fix BCA wallet specifically
    const bcaWallet = wallets.find(w => w.name.toLowerCase().includes('bca'));
    if (bcaWallet && bcaWallet.balance < 0) {
      window.fixBCAWallet = async (newBalance = 0) => {
        try {
          const updatedWallet = { ...bcaWallet, balance: parseFloat(newBalance) };
          await updateWallet(updatedWallet, user.id);
          console.log(`✅ Fixed BCA wallet: ${bcaWallet.balance.toFixed(2)} → ${newBalance}`);
          console.log('💡 Refresh the page to see the changes.');
        } catch (error) {
          console.error('❌ Failed to fix BCA wallet:', error);
        }
      };
      
      console.log('\n🎯 BCA Wallet Quick Fix:');
      console.log(`BCA wallet has balance: ${bcaWallet.balance.toFixed(2)}`);
      console.log('Run: fixBCAWallet() to set it to 0');
      console.log('Run: fixBCAWallet(1000) to set it to 1000');
    }

    console.log('\n📋 Available Commands:');
    console.log('• fixAllNegativeWallets() - Fix all negative balances to 0');
    console.log('• fixWallet("wallet-id", newBalance) - Fix specific wallet');
    if (bcaWallet && bcaWallet.balance < 0) {
      console.log('• fixBCAWallet(newBalance) - Fix BCA wallet specifically');
    }
    
    console.log('\n💡 Example usage:');
    console.log('fixAllNegativeWallets()');
    console.log('fixWallet("' + negativeWallets[0]?.id + '", 1000)');

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n🔧 Manual Fix Instructions:');
    console.log('1. Go to the Wallets section in your app');
    console.log('2. Edit the wallet with negative balance');
    console.log('3. Set the balance to a positive number (e.g., 0 or 1000)');
    console.log('4. Save the wallet');
  }
})(); 