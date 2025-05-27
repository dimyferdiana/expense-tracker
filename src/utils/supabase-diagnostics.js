/**
 * Supabase Diagnostics Utility
 * Helps diagnose connectivity and CORS issues
 */

import supabase from './supabase';

export class SupabaseDiagnostics {
  /**
   * Run comprehensive diagnostics
   */
  static async runDiagnostics() {
    console.group('🔍 Supabase Diagnostics');
    
    const results = {
      timestamp: new Date().toISOString(),
      browser: this.getBrowserInfo(),
      network: await this.checkNetworkConnectivity(),
      supabase: await this.checkSupabaseConnectivity(),
      auth: await this.checkAuthStatus(),
      cors: await this.checkCorsHeaders(),
      recommendations: []
    };
    
    // Generate recommendations based on results
    results.recommendations = this.generateRecommendations(results);
    
    console.log('📊 Diagnostic Results:', results);
    console.groupEnd();
    
    return results;
  }
  
  /**
   * Get browser information
   */
  static getBrowserInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      onLine: navigator.onLine,
      cookieEnabled: navigator.cookieEnabled,
      platform: navigator.platform,
      vendor: navigator.vendor
    };
  }
  
  /**
   * Check basic network connectivity
   */
  static async checkNetworkConnectivity() {
    const results = {
      online: navigator.onLine,
      googleReachable: false,
      supabaseStatusReachable: false
    };
    
    try {
      // Test basic internet connectivity
      const googleResponse = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      results.googleReachable = true;
    } catch (error) {
      console.warn('Google connectivity test failed:', error.message);
    }
    
    try {
      // Test Supabase status page
      const statusResponse = await fetch('https://status.supabase.com', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      results.supabaseStatusReachable = true;
    } catch (error) {
      console.warn('Supabase status page test failed:', error.message);
    }
    
    return results;
  }
  
  /**
   * Check Supabase connectivity
   */
  static async checkSupabaseConnectivity() {
    const results = {
      urlValid: false,
      apiKeyValid: false,
      restApiReachable: false,
      authApiReachable: false,
      error: null
    };
    
    try {
      // Validate URL format
      const url = supabase.supabaseUrl;
      results.urlValid = url && url.startsWith('https://') && url.includes('.supabase.co');
      
      // Validate API key format
      const key = supabase.supabaseKey;
      results.apiKeyValid = key && key.startsWith('eyJ') && key.length > 100;
      
      // Test REST API connectivity
      try {
        const { data, error } = await supabase
          .from('expenses')
          .select('count', { count: 'exact' })
          .limit(0);
        
        if (error) {
          results.error = error;
          if (error.code === '42P01') {
            results.restApiReachable = true; // API is reachable, just no tables
          }
        } else {
          results.restApiReachable = true;
        }
      } catch (restError) {
        results.error = restError;
        console.warn('REST API test failed:', restError);
      }
      
      // Test Auth API connectivity
      try {
        const { data, error } = await supabase.auth.getSession();
        results.authApiReachable = true;
      } catch (authError) {
        console.warn('Auth API test failed:', authError);
      }
      
    } catch (error) {
      results.error = error;
      console.error('Supabase connectivity test failed:', error);
    }
    
    return results;
  }
  
  /**
   * Check authentication status
   */
  static async checkAuthStatus() {
    const results = {
      hasSession: false,
      userAuthenticated: false,
      sessionValid: false,
      error: null
    };
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        results.error = error;
      } else {
        results.hasSession = !!session;
        results.userAuthenticated = !!session?.user;
        results.sessionValid = session?.expires_at ? new Date(session.expires_at * 1000) > new Date() : false;
      }
    } catch (error) {
      results.error = error;
      console.error('Auth status check failed:', error);
    }
    
    return results;
  }
  
  /**
   * Check CORS headers by making a test request
   */
  static async checkCorsHeaders() {
    const results = {
      corsHeadersPresent: false,
      allowedOrigins: null,
      allowedMethods: null,
      allowedHeaders: null,
      error: null
    };
    
    try {
      // Make a simple OPTIONS request to check CORS headers
      const response = await fetch(supabase.supabaseUrl + '/rest/v1/', {
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'apikey, authorization, content-type'
        }
      });
      
      results.corsHeadersPresent = response.headers.has('access-control-allow-origin');
      results.allowedOrigins = response.headers.get('access-control-allow-origin');
      results.allowedMethods = response.headers.get('access-control-allow-methods');
      results.allowedHeaders = response.headers.get('access-control-allow-headers');
      
    } catch (error) {
      results.error = error;
      console.warn('CORS headers check failed:', error);
    }
    
    return results;
  }
  
  /**
   * Generate recommendations based on diagnostic results
   */
  static generateRecommendations(results) {
    const recommendations = [];
    
    // Network connectivity issues
    if (!results.network.online) {
      recommendations.push({
        priority: 'high',
        category: 'network',
        issue: 'Device appears to be offline',
        solution: 'Check your internet connection and try again'
      });
    }
    
    if (!results.network.googleReachable) {
      recommendations.push({
        priority: 'high',
        category: 'network',
        issue: 'Basic internet connectivity failed',
        solution: 'Check firewall, proxy settings, or network restrictions'
      });
    }
    
    // Supabase configuration issues
    if (!results.supabase.urlValid) {
      recommendations.push({
        priority: 'critical',
        category: 'config',
        issue: 'Invalid Supabase URL format',
        solution: 'Check your Supabase URL in src/utils/supabase.js - it should be https://your-project.supabase.co'
      });
    }
    
    if (!results.supabase.apiKeyValid) {
      recommendations.push({
        priority: 'critical',
        category: 'config',
        issue: 'Invalid API key format',
        solution: 'Check your Supabase anon key in src/utils/supabase.js - it should start with "eyJ"'
      });
    }
    
    if (!results.supabase.restApiReachable) {
      recommendations.push({
        priority: 'high',
        category: 'connectivity',
        issue: 'Cannot reach Supabase REST API',
        solution: 'Check if your Supabase project is active and the URL/key are correct'
      });
    }
    
    // CORS issues
    if (!results.cors.corsHeadersPresent) {
      recommendations.push({
        priority: 'medium',
        category: 'cors',
        issue: 'CORS headers not detected',
        solution: 'This might be normal for Supabase, but if you\'re getting CORS errors, try using a different browser or check for browser extensions blocking requests'
      });
    }
    
    // Auth issues
    if (results.auth.error) {
      recommendations.push({
        priority: 'medium',
        category: 'auth',
        issue: 'Authentication error detected',
        solution: 'Try signing out and signing back in, or check if your session has expired'
      });
    }
    
    // Database setup issues
    if (results.supabase.error?.code === '42P01') {
      recommendations.push({
        priority: 'high',
        category: 'database',
        issue: 'Database tables not found',
        solution: 'Run the SQL setup script from MIGRATION-GUIDE.md in your Supabase SQL Editor'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Test a specific operation to see if it works
   */
  static async testOperation(operation = 'select') {
    console.group(`🧪 Testing ${operation} operation`);
    
    try {
      let result;
      
      switch (operation) {
        case 'select':
          result = await supabase
            .from('expenses')
            .select('count', { count: 'exact' })
            .limit(0);
          break;
          
        case 'insert':
          // Test insert with a dummy record (will likely fail due to validation, but tests connectivity)
          result = await supabase
            .from('expenses')
            .insert({ 
              amount: 0, 
              description: 'test', 
              date: new Date().toISOString().split('T')[0],
              user_id: 'test'
            });
          break;
          
        case 'auth':
          result = await supabase.auth.getSession();
          break;
          
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
      
      console.log(`✅ ${operation} operation successful:`, result);
      return { success: true, result };
      
    } catch (error) {
      console.error(`❌ ${operation} operation failed:`, error);
      
      // Analyze the error
      const analysis = this.analyzeError(error);
      console.log('🔍 Error analysis:', analysis);
      
      return { success: false, error, analysis };
    } finally {
      console.groupEnd();
    }
  }
  
  /**
   * Analyze an error to provide helpful insights
   */
  static analyzeError(error) {
    const analysis = {
      type: 'unknown',
      likely_cause: 'Unknown error',
      suggestions: []
    };
    
    if (error.message?.includes('NetworkError') || error.message?.includes('fetch')) {
      analysis.type = 'network';
      analysis.likely_cause = 'Network connectivity or CORS issue';
      analysis.suggestions = [
        'Check internet connection',
        'Try in incognito mode',
        'Check browser console for CORS errors',
        'Verify Supabase project is active'
      ];
    } else if (error.code === '42P01') {
      analysis.type = 'database';
      analysis.likely_cause = 'Database tables not created';
      analysis.suggestions = [
        'Run the SQL setup script in Supabase SQL Editor',
        'Check MIGRATION-GUIDE.md for setup instructions'
      ];
    } else if (error.code === 'PGRST116') {
      analysis.type = 'data';
      analysis.likely_cause = 'No data found (this might be normal)';
      analysis.suggestions = [
        'This error is often normal when no data exists',
        'Try adding some data first'
      ];
    } else if (error.message?.includes('JWT') || error.message?.includes('auth')) {
      analysis.type = 'authentication';
      analysis.likely_cause = 'Authentication or authorization issue';
      analysis.suggestions = [
        'Check if user is logged in',
        'Verify API key is correct',
        'Check RLS policies in Supabase'
      ];
    }
    
    return analysis;
  }
}

// Make diagnostics available globally for easy debugging
if (typeof window !== 'undefined') {
  window.SupabaseDiagnostics = SupabaseDiagnostics;
  console.log('🔧 SupabaseDiagnostics available globally. Try: SupabaseDiagnostics.runDiagnostics()');
}

export default SupabaseDiagnostics; 