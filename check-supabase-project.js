const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with your project credentials
const supabaseUrl = 'https://mplrakcyrohgkqdhzpry.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wbHJha2N5cm9oZ2txZGh6cHJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0NjQ4NTIsImV4cCI6MjA2MzA0MDg1Mn0.uPw-jom-Hsio1-yot4tJQ15FKrPxe0itLfyXPY-qREw';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProject() {
  console.log('Checking Supabase project...');
  console.log('URL:', supabaseUrl);
  
  try {
    // Basic connectivity test
    console.log('\nBasic connectivity test:');
    const { data: pingData, error: pingError } = await supabase.from('pg_catalog.pg_tables').select('*').limit(1);
    
    if (pingError) {
      console.error('Error querying Supabase:', pingError);
    } else {
      console.log('Successfully connected to Supabase');
    }
    
    // Check what schemas are available
    console.log('\nAvailable schemas:');
    const { data: schemaData, error: schemaError } = await supabase.rpc('get_schemas');
    
    if (schemaError) {
      console.error('Error getting schemas:', schemaError);
      
      // Try a different approach
      console.log('Trying alternative schema query...');
      const { data: altSchemaData, error: altSchemaError } = await supabase
        .from('pg_catalog.pg_namespace')
        .select('nspname')
        .limit(10);
      
      if (altSchemaError) {
        console.error('Error with alternative schema query:', altSchemaError);
      } else {
        console.log('Schemas:', altSchemaData);
      }
    } else {
      console.log('Schemas:', schemaData);
    }
    
    // Test auth service
    console.log('\nTesting auth service:');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError);
    } else {
      console.log('Auth service is working');
      console.log('Session:', sessionData);
    }
    
  } catch (error) {
    console.error('Unexpected error during project check:', error);
  }
}

checkProject(); 