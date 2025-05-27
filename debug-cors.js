// CORS Debug Script for Expense Tracker
// Run this in the browser console to diagnose CORS issues

console.log('🔍 CORS Debug Script for Expense Tracker');
console.log('==========================================');

// Check if SupabaseDiagnostics is available
if (typeof window !== 'undefined' && window.SupabaseDiagnostics) {
  console.log('✅ SupabaseDiagnostics is available');
  
  // Run comprehensive diagnostics
  console.log('\n🧪 Running comprehensive diagnostics...');
  window.SupabaseDiagnostics.runDiagnostics().then(results => {
    console.log('\n📊 Diagnostic Results Summary:');
    console.log('- Network Online:', results.network.online);
    console.log('- Google Reachable:', results.network.googleReachable);
    console.log('- Supabase API Reachable:', results.supabase.restApiReachable);
    console.log('- User Authenticated:', results.auth.userAuthenticated);
    console.log('- CORS Headers Present:', results.cors.corsHeadersPresent);
    
    if (results.recommendations.length > 0) {
      console.log('\n⚠️ Recommendations:');
      results.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.issue}`);
        console.log(`   Solution: ${rec.solution}`);
      });
    } else {
      console.log('\n✅ No issues detected!');
    }
    
    // Test specific operations
    console.log('\n🧪 Testing specific operations...');
    
    // Test database connection
    window.SupabaseDiagnostics.testOperation('select').then(result => {
      if (result.success) {
        console.log('✅ Database SELECT test: PASSED');
      } else {
        console.log('❌ Database SELECT test: FAILED');
        console.log('Error:', result.error.message);
        if (result.analysis) {
          console.log('Analysis:', result.analysis);
        }
      }
    });
    
    // Test auth
    window.SupabaseDiagnostics.testOperation('auth').then(result => {
      if (result.success) {
        console.log('✅ Auth test: PASSED');
      } else {
        console.log('❌ Auth test: FAILED');
        console.log('Error:', result.error.message);
      }
    });
  });
  
} else {
  console.error('❌ SupabaseDiagnostics is not available');
  console.log('Make sure the app is loaded and the diagnostics utility is initialized');
}

// Manual CORS test
console.log('\n🌐 Manual CORS Test');
console.log('Testing direct fetch to Supabase...');

const supabaseUrl = 'https://mplrakcyrohgkqdhzpry.supabase.co';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wbHJha2N5cm9oZ2txZGh6cHJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0NjQ4NTIsImV4cCI6MjA2MzA0MDg1Mn0.uPw-jom-Hsio1-yot4tJQ15FKrPxe0itLfyXPY-qREw';

fetch(`${supabaseUrl}/rest/v1/expenses?select=count`, {
  method: 'GET',
  headers: {
    'apikey': apiKey,
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('✅ Direct fetch successful!');
  console.log('Status:', response.status);
  console.log('Headers:', Object.fromEntries(response.headers.entries()));
  return response.json();
})
.then(data => {
  console.log('Response data:', data);
})
.catch(error => {
  console.error('❌ Direct fetch failed:', error);
  
  if (error.message.includes('NetworkError') || error.message.includes('CORS')) {
    console.log('\n🚨 This appears to be a CORS/Network error!');
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Check your internet connection');
    console.log('2. Try opening the app in incognito/private mode');
    console.log('3. Check if any browser extensions are blocking requests');
    console.log('4. Verify Supabase project is active: https://app.supabase.io');
    console.log('5. Check Supabase status: https://status.supabase.com');
    console.log('6. Try a different browser (Chrome, Firefox, Safari)');
    console.log('7. Check firewall/antivirus settings');
  }
});

// Check browser environment
console.log('\n🌍 Browser Environment:');
console.log('- User Agent:', navigator.userAgent);
console.log('- Online:', navigator.onLine);
console.log('- Language:', navigator.language);
console.log('- Platform:', navigator.platform);
console.log('- Cookies Enabled:', navigator.cookieEnabled);
console.log('- Current Origin:', window.location.origin);

// Check for common issues
console.log('\n🔍 Common Issue Checks:');

// Check if running on localhost
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log('⚠️ Running on localhost - this is usually fine for development');
} else {
  console.log('✅ Running on a proper domain');
}

// Check if HTTPS
if (window.location.protocol === 'https:') {
  console.log('✅ Using HTTPS');
} else {
  console.log('⚠️ Using HTTP - some features may not work properly');
}

// Check for service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    if (registrations.length > 0) {
      console.log('⚠️ Service workers detected - they might interfere with requests');
      console.log('Registered service workers:', registrations.length);
    } else {
      console.log('✅ No service workers registered');
    }
  });
}

console.log('\n📝 Next Steps:');
console.log('1. Review the diagnostic results above');
console.log('2. Follow any recommendations provided');
console.log('3. If issues persist, try the troubleshooting guide in the app');
console.log('4. Check the Network tab in DevTools for failed requests');
console.log('5. Look for any red errors in the Console tab');

console.log('\n💡 Pro Tips:');
console.log('- Press F12 to open DevTools');
console.log('- Check the Network tab for failed requests');
console.log('- Look for CORS errors in the Console');
console.log('- Try refreshing the page');
console.log('- Clear browser cache if needed'); 