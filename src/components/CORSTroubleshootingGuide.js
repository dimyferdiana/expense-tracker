import React, { useState } from 'react';
import SupabaseDiagnostics from '../utils/supabase-diagnostics';

function CORSTroubleshootingGuide({ onClose }) {
  const [diagnostics, setDiagnostics] = useState(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);

  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    try {
      const results = await SupabaseDiagnostics.runDiagnostics();
      setDiagnostics(results);
    } catch (error) {
      console.error('Failed to run diagnostics:', error);
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const testOperation = async (operation) => {
    console.log(`Testing ${operation} operation...`);
    const result = await SupabaseDiagnostics.testOperation(operation);
    console.log(`${operation} test result:`, result);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">CORS/Network Error Troubleshooting</h2>
              <p className="text-gray-400">Diagnose and fix connectivity issues</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={runDiagnostics}
              disabled={isRunningDiagnostics}
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-md transition-colors disabled:opacity-50"
            >
              {isRunningDiagnostics ? 'Running...' : '🔍 Run Diagnostics'}
            </button>
            <button
              onClick={() => testOperation('select')}
              className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-md transition-colors"
            >
              🧪 Test Database
            </button>
            <button
              onClick={() => testOperation('auth')}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md transition-colors"
            >
              🔐 Test Auth
            </button>
          </div>
        </div>

        {/* Common Solutions */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-4">Common Solutions</h3>
          <div className="space-y-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">1. Check Internet Connection</h4>
              <p className="text-gray-300 text-sm mb-2">
                Ensure you have a stable internet connection and can access other websites.
              </p>
              <button
                onClick={() => window.open('https://www.google.com', '_blank')}
                className="text-indigo-400 hover:text-indigo-300 text-sm"
              >
                Test with Google →
              </button>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">2. Try Incognito/Private Mode</h4>
              <p className="text-gray-300 text-sm">
                Browser extensions or cached data might be interfering. Try opening the app in incognito/private mode.
              </p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">3. Check Supabase Status</h4>
              <p className="text-gray-300 text-sm mb-2">
                Verify that Supabase services are operational.
              </p>
              <button
                onClick={() => window.open('https://status.supabase.com', '_blank')}
                className="text-indigo-400 hover:text-indigo-300 text-sm"
              >
                Check Supabase Status →
              </button>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">4. Verify Configuration</h4>
              <p className="text-gray-300 text-sm">
                Check that your Supabase URL and API key are correctly configured in the app.
              </p>
              <div className="mt-2 text-xs text-gray-400 font-mono bg-gray-800 p-2 rounded">
                URL: {window.location.origin}<br/>
                Supabase URL: https://mplrakcyrohgkqdhzpry.supabase.co
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">5. Database Setup</h4>
              <p className="text-gray-300 text-sm mb-2">
                Ensure your Supabase database tables are properly created.
              </p>
              <button
                onClick={() => window.open('https://app.supabase.io', '_blank')}
                className="text-indigo-400 hover:text-indigo-300 text-sm"
              >
                Open Supabase Dashboard →
              </button>
            </div>
          </div>
        </div>

        {/* Diagnostic Results */}
        {diagnostics && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-4">Diagnostic Results</h3>
            
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className={`p-3 rounded-lg ${diagnostics.network.online ? 'bg-green-900' : 'bg-red-900'}`}>
                <div className="text-sm text-gray-300">Network</div>
                <div className="font-medium text-white">
                  {diagnostics.network.online ? '✅ Online' : '❌ Offline'}
                </div>
              </div>
              
              <div className={`p-3 rounded-lg ${diagnostics.supabase.restApiReachable ? 'bg-green-900' : 'bg-red-900'}`}>
                <div className="text-sm text-gray-300">Supabase API</div>
                <div className="font-medium text-white">
                  {diagnostics.supabase.restApiReachable ? '✅ Reachable' : '❌ Unreachable'}
                </div>
              </div>
              
              <div className={`p-3 rounded-lg ${diagnostics.auth.userAuthenticated ? 'bg-green-900' : 'bg-yellow-900'}`}>
                <div className="text-sm text-gray-300">Authentication</div>
                <div className="font-medium text-white">
                  {diagnostics.auth.userAuthenticated ? '✅ Authenticated' : '⚠️ Not Authenticated'}
                </div>
              </div>
              
              <div className={`p-3 rounded-lg ${diagnostics.cors.corsHeadersPresent ? 'bg-green-900' : 'bg-yellow-900'}`}>
                <div className="text-sm text-gray-300">CORS</div>
                <div className="font-medium text-white">
                  {diagnostics.cors.corsHeadersPresent ? '✅ Headers Present' : '⚠️ No Headers'}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {diagnostics.recommendations.length > 0 && (
              <div className="bg-yellow-900/50 border border-yellow-800 rounded-lg p-4">
                <h4 className="font-medium text-yellow-200 mb-3">Recommendations</h4>
                <div className="space-y-2">
                  {diagnostics.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start">
                      <span className={`inline-block w-2 h-2 rounded-full mt-2 mr-3 ${
                        rec.priority === 'critical' ? 'bg-red-500' :
                        rec.priority === 'high' ? 'bg-orange-500' :
                        'bg-yellow-500'
                      }`}></span>
                      <div>
                        <div className="text-yellow-200 font-medium">{rec.issue}</div>
                        <div className="text-yellow-300 text-sm">{rec.solution}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw Data (Collapsible) */}
            <details className="mt-4">
              <summary className="cursor-pointer text-gray-400 hover:text-white">
                View Raw Diagnostic Data
              </summary>
              <pre className="mt-2 text-xs text-gray-300 bg-gray-900 p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(diagnostics, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Manual Steps */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-4">Manual Troubleshooting Steps</h3>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex items-start">
              <span className="inline-block w-6 h-6 bg-indigo-600 text-white rounded-full text-center text-xs leading-6 mr-3 mt-0.5">1</span>
              <div>
                <strong>Open Browser Console:</strong> Press F12 and check the Console tab for detailed error messages.
              </div>
            </div>
            <div className="flex items-start">
              <span className="inline-block w-6 h-6 bg-indigo-600 text-white rounded-full text-center text-xs leading-6 mr-3 mt-0.5">2</span>
              <div>
                <strong>Check Network Tab:</strong> Look for failed requests and their status codes.
              </div>
            </div>
            <div className="flex items-start">
              <span className="inline-block w-6 h-6 bg-indigo-600 text-white rounded-full text-center text-xs leading-6 mr-3 mt-0.5">3</span>
              <div>
                <strong>Try Different Browser:</strong> Test in Chrome, Firefox, or Safari to isolate browser-specific issues.
              </div>
            </div>
            <div className="flex items-start">
              <span className="inline-block w-6 h-6 bg-indigo-600 text-white rounded-full text-center text-xs leading-6 mr-3 mt-0.5">4</span>
              <div>
                <strong>Check Firewall/Antivirus:</strong> Temporarily disable to see if they're blocking requests.
              </div>
            </div>
            <div className="flex items-start">
              <span className="inline-block w-6 h-6 bg-indigo-600 text-white rounded-full text-center text-xs leading-6 mr-3 mt-0.5">5</span>
              <div>
                <strong>Contact Support:</strong> If issues persist, contact your system administrator or Supabase support.
              </div>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-6 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default CORSTroubleshootingGuide; 