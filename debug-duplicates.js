// Debug script for duplicate prevention system
// Run this in the browser console to diagnose issues

console.log('🔍 Duplicate Prevention Debug Script');
console.log('=====================================');

// Check if the debugger is available
if (typeof window !== 'undefined' && window.DuplicateCleanupDebugger) {
  console.log('✅ DuplicateCleanupDebugger is available');
  
  // Run the test
  console.log('\n🧪 Running duplicate prevention test...');
  const testResult = window.DuplicateCleanupDebugger.testDuplicatePrevention();
  
  console.log('\n📊 Test Results:');
  console.log('- Test passed:', testResult.testPassed);
  console.log('- Tracked duplicates count:', testResult.trackedCount);
  console.log('- Statistics:', testResult.statistics);
  
  // Show current status
  console.log('\n📈 Current Status:');
  window.DuplicateCleanupDebugger.debugStatus();
  
  // Instructions for manual testing
  console.log('\n📝 Manual Testing Instructions:');
  console.log('1. Use duplicate cleanup tool to remove some duplicates');
  console.log('2. Check if they are tracked: DuplicateCleanupDebugger.isRecentlyCleaned("TRANSACTION_ID")');
  console.log('3. Try to add the same transaction again - should get warning');
  console.log('4. Check sync logs for "Skipping download" messages');
  
} else {
  console.error('❌ DuplicateCleanupDebugger is not available');
  console.log('Make sure the app is loaded and the duplicate cleanup utility is initialized');
}

// Check localStorage for tracked duplicates
const trackedKey = 'expense_tracker_cleaned_duplicates';
const tracked = localStorage.getItem(trackedKey);
if (tracked) {
  try {
    const parsedTracked = JSON.parse(tracked);
    console.log('\n💾 LocalStorage tracked duplicates:', parsedTracked);
    console.log('Count:', Object.keys(parsedTracked).length);
  } catch (e) {
    console.error('❌ Error parsing tracked duplicates from localStorage:', e);
  }
} else {
  console.log('\n💾 No tracked duplicates found in localStorage');
}

// Check for recent sync errors
const syncStatus = localStorage.getItem('syncStatus');
if (syncStatus) {
  try {
    const parsedStatus = JSON.parse(syncStatus);
    if (parsedStatus.errors && parsedStatus.errors.length > 0) {
      console.log('\n⚠️ Recent sync errors:', parsedStatus.errors.slice(-3));
    } else {
      console.log('\n✅ No recent sync errors');
    }
  } catch (e) {
    console.error('❌ Error parsing sync status:', e);
  }
}

console.log('\n🎯 Next Steps:');
console.log('1. Clean up some duplicates using the UI');
console.log('2. Watch the console for tracking messages');
console.log('3. Try to add the same transaction again');
console.log('4. Check if sync skips downloading cleaned duplicates'); 