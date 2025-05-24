import { WalletUtils } from './walletOperations';

/**
 * Simple test suite for wallet operations
 * Run this in the browser console to verify calculations work correctly
 */
export const runWalletOperationsTests = () => {
  console.log('🧪 Running Wallet Operations Tests...');
  
  let passed = 0;
  let failed = 0;
  
  const test = (name, actual, expected) => {
    const isEqual = Math.abs(actual - expected) < 0.001; // Allow for tiny floating point differences
    if (isEqual) {
      console.log(`✅ ${name}: PASSED`);
      passed++;
    } else {
      console.error(`❌ ${name}: FAILED - Expected ${expected}, got ${actual}`);
      failed++;
    }
  };
  
  // Test basic arithmetic
  test('Add to balance: 100 + 25.50', WalletUtils.addToBalance(100, 25.50), 125.50);
  test('Subtract from balance: 100 - 25.50', WalletUtils.subtractFromBalance(100, 25.50), 74.50);
  
  // Test edge cases
  test('Add with null balance', WalletUtils.addToBalance(null, 50), 50);
  test('Add with undefined amount', WalletUtils.addToBalance(100, undefined), 100);
  test('Subtract from zero balance', WalletUtils.subtractFromBalance(0, 25), -25);
  
  // Test floating point precision issues
  test('Precision test: 0.1 + 0.2', WalletUtils.addToBalance(0.1, 0.2), 0.3);
  test('Precision test: 1.1 + 2.2', WalletUtils.addToBalance(1.1, 2.2), 3.3);
  test('Precision test: 10.1 - 0.1', WalletUtils.subtractFromBalance(10.1, 0.1), 10.0);
  
  // Test adjustment calculations
  test('Income adjustment', WalletUtils.calculateAdjustment(100, true), 100);
  test('Expense adjustment', WalletUtils.calculateAdjustment(100, false), -100);
  test('Reverse income adjustment', WalletUtils.calculateAdjustment(100, true, true), -100);
  test('Reverse expense adjustment', WalletUtils.calculateAdjustment(100, false, true), 100);
  
  // Test balance sufficiency
  const hasSufficient1 = WalletUtils.hasSufficientBalance(100, 50);
  const hasSufficient2 = WalletUtils.hasSufficientBalance(30, 50);
  test('Sufficient balance check (true)', hasSufficient1 ? 1 : 0, 1);
  test('Insufficient balance check (false)', hasSufficient2 ? 1 : 0, 0);
  
  // Test formatting
  const formatted1 = WalletUtils.formatBalance(123.456);
  const formatted2 = WalletUtils.formatBalance(100);
  test('Format balance with decimals', parseFloat(formatted1), 123.46);
  test('Format balance whole number', parseFloat(formatted2), 100.00);
  
  // Test complex operations (simulating real-world scenarios)
  let balance = 1000;
  balance = WalletUtils.addToBalance(balance, 250.75); // Income
  balance = WalletUtils.subtractFromBalance(balance, 125.25); // Expense
  balance = WalletUtils.addToBalance(balance, 50.50); // Income
  test('Complex operation sequence', balance, 1176.00);
  
  // Test wallet transfer simulation
  let sourceBalance = 500;
  let destBalance = 200;
  const transferAmount = 150.75;
  
  sourceBalance = WalletUtils.subtractFromBalance(sourceBalance, transferAmount);
  destBalance = WalletUtils.addToBalance(destBalance, transferAmount);
  
  test('Transfer source balance', sourceBalance, 349.25);
  test('Transfer destination balance', destBalance, 350.75);
  test('Transfer conservation (total should remain same)', sourceBalance + destBalance, 700);
  
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Wallet operations are working correctly.');
  } else {
    console.error(`⚠️  ${failed} tests failed. Please check the implementation.`);
  }
  
  return { passed, failed };
};

// Export for manual testing
if (typeof window !== 'undefined') {
  window.runWalletOperationsTests = runWalletOperationsTests;
} 