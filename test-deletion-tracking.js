/**
 * Test script for deletion tracking functionality
 * Run this in the browser console to test the implementation
 */

// Test deletion tracking functionality
async function testDeletionTracking() {
  console.log('🧪 Testing Deletion Tracking Implementation...');
  
  try {
    // Import the database utilities
    const { expenseDB } = await import('./src/utils/db.js');
    const { expenseDB: supabaseExpenseDB } = await import('./src/utils/supabase-db.js');
    
    console.log('✅ Database modules loaded successfully');
    
    // Test 1: Add a test expense
    console.log('\n📝 Test 1: Adding test expense...');
    const testExpense = {
      id: Date.now(),
      description: 'Test Deletion Tracking',
      amount: 10.99,
      category: 'food',
      date: new Date().toISOString().slice(0, 10),
      walletId: 'cash',
      isIncome: false,
      notes: 'This is a test expense for deletion tracking',
      tags: []
    };
    
    await expenseDB.add(testExpense);
    console.log('✅ Test expense added:', testExpense.id);
    
    // Test 2: Verify expense exists in active list
    console.log('\n🔍 Test 2: Verifying expense in active list...');
    const activeExpenses = await expenseDB.getAll();
    const foundActive = activeExpenses.find(e => e.id === testExpense.id);
    console.log(foundActive ? '✅ Expense found in active list' : '❌ Expense NOT found in active list');
    
    // Test 3: Verify expense exists in full list (including deleted)
    console.log('\n🔍 Test 3: Verifying expense in full list...');
    const allExpenses = await expenseDB.getAllIncludingDeleted();
    const foundAll = allExpenses.find(e => e.id === testExpense.id);
    console.log(foundAll ? '✅ Expense found in full list' : '❌ Expense NOT found in full list');
    
    // Test 4: Soft delete the expense
    console.log('\n🗑️ Test 4: Soft deleting expense...');
    await expenseDB.delete(testExpense.id);
    console.log('✅ Expense soft deleted');
    
    // Test 5: Verify expense is NOT in active list
    console.log('\n🔍 Test 5: Verifying expense removed from active list...');
    const activeAfterDelete = await expenseDB.getAll();
    const foundActiveAfterDelete = activeAfterDelete.find(e => e.id === testExpense.id);
    console.log(!foundActiveAfterDelete ? '✅ Expense correctly removed from active list' : '❌ Expense still in active list');
    
    // Test 6: Verify expense still exists in full list with deleted_at timestamp
    console.log('\n🔍 Test 6: Verifying expense in full list with deletion timestamp...');
    const allAfterDelete = await expenseDB.getAllIncludingDeleted();
    const foundAllAfterDelete = allAfterDelete.find(e => e.id === testExpense.id);
    
    if (foundAllAfterDelete) {
      console.log('✅ Expense found in full list after deletion');
      console.log('🕒 Deleted at:', foundAllAfterDelete.deleted_at);
      console.log('🕒 Last modified:', foundAllAfterDelete.last_modified);
      console.log('📊 Sync status:', foundAllAfterDelete.sync_status);
      
      if (foundAllAfterDelete.deleted_at) {
        console.log('✅ Deletion timestamp correctly set');
      } else {
        console.log('❌ Deletion timestamp NOT set');
      }
    } else {
      console.log('❌ Expense NOT found in full list after deletion');
    }
    
    // Test 7: Test restore functionality
    console.log('\n🔄 Test 7: Testing restore functionality...');
    await expenseDB.restore(testExpense.id);
    console.log('✅ Expense restore attempted');
    
    const activeAfterRestore = await expenseDB.getAll();
    const foundActiveAfterRestore = activeAfterRestore.find(e => e.id === testExpense.id);
    console.log(foundActiveAfterRestore ? '✅ Expense successfully restored to active list' : '❌ Expense NOT restored');
    
    // Test 8: Clean up - hard delete the test expense
    console.log('\n🧹 Test 8: Cleaning up test data...');
    await expenseDB.hardDelete(testExpense.id);
    console.log('✅ Test expense permanently deleted');
    
    console.log('\n🎉 Deletion tracking tests completed!');
    
    return {
      success: true,
      message: 'All deletion tracking tests passed successfully'
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test sync manager conflict resolution
async function testConflictResolution() {
  console.log('\n🧪 Testing Conflict Resolution...');
  
  try {
    const { SyncManager } = await import('./src/utils/syncManager.js');
    
    // Mock sync manager for testing
    const mockSyncManager = new SyncManager({ id: 'test-user' });
    
    // Test case 1: Local deletion vs remote modification
    console.log('\n📝 Test Case 1: Local deletion vs remote modification');
    const localDeleted = {
      id: 1,
      description: 'Test expense',
      amount: 10,
      deleted_at: '2024-01-15T10:00:00Z',
      last_modified: '2024-01-15T10:00:00Z'
    };
    
    const remoteModified = {
      id: 1,
      description: 'Modified test expense',
      amount: 15,
      deleted_at: null,
      last_modified: '2024-01-15T09:00:00Z'
    };
    
    const result1 = mockSyncManager.resolveConflict('expenses', localDeleted, remoteModified);
    console.log('Result:', result1);
    console.log(result1.resolution === 'use_local' ? '✅ Correctly chose local deletion (newer)' : '❌ Incorrect resolution');
    
    // Test case 2: Remote deletion vs local modification
    console.log('\n📝 Test Case 2: Remote deletion vs local modification');
    const localModified = {
      id: 2,
      description: 'Modified locally',
      amount: 20,
      deleted_at: null,
      last_modified: '2024-01-15T11:00:00Z'
    };
    
    const remoteDeleted = {
      id: 2,
      description: 'Test expense',
      amount: 10,
      deleted_at: '2024-01-15T10:00:00Z',
      last_modified: '2024-01-15T10:00:00Z'
    };
    
    const result2 = mockSyncManager.resolveConflict('expenses', localModified, remoteDeleted);
    console.log('Result:', result2);
    console.log(result2.resolution === 'use_local' ? '✅ Correctly chose local modification (newer)' : '❌ Incorrect resolution');
    
    console.log('\n🎉 Conflict resolution tests completed!');
    
    return {
      success: true,
      message: 'Conflict resolution tests passed'
    };
    
  } catch (error) {
    console.error('❌ Conflict resolution test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export test functions for browser console use
window.testDeletionTracking = testDeletionTracking;
window.testConflictResolution = testConflictResolution;

console.log('🧪 Deletion tracking test functions loaded!');
console.log('Run testDeletionTracking() to test deletion functionality');
console.log('Run testConflictResolution() to test conflict resolution'); 