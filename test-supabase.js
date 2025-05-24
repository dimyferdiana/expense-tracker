import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with your project credentials
const supabaseUrl = 'https://mplrakcyrohgkqdhzpry.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wbHJha2N5cm9oZ2txZGh6cHJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0NjQ4NTIsImV4cCI6MjA2MzA0MDg1Mn0.uPw-jom-Hsio1-yot4tJQ15FKrPxe0itLfyXPY-qREw';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabaseConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // List all tables in the database
    console.log('Attempting to list available tables:');
    const { data: tables, error: tablesError } = await supabase.rpc('get_schema_tables');
    
    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
    } else {
      console.log('Tables in database:', tables);
    }
    
    // Try to access the expenses table specifically
    console.log('Attempting to query expenses table:');
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .limit(1);
    
    if (expensesError) {
      console.error('Error accessing expenses table:', expensesError);
    } else {
      console.log('Successfully accessed expenses table:', expenses);
    }
    
    // Check if all required tables exist
    const requiredTables = ['expenses', 'categories', 'tags', 'wallets', 'transfers', 'budgets'];
    
    for (const table of requiredTables) {
      const { data, error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        console.error(`Error accessing ${table} table:`, error);
      } else {
        console.log(`${table} table exists and accessible`);
      }
    }
    
  } catch (error) {
    console.error('Unexpected error during Supabase tests:', error);
  }
}

testSupabaseConnection(); 