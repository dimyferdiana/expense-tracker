// Simple script to check if Supabase tables exist
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with your project credentials
const supabaseUrl = 'https://mplrakcyrohgkqdhzpry.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wbHJha2N5cm9oZ2txZGh6cHJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0NjQ4NTIsImV4cCI6MjA2MzA0MDg1Mn0.uPw-jom-Hsio1-yot4tJQ15FKrPxe0itLfyXPY-qREw';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
  console.log('Checking Supabase tables...');
  
  try {
    // Check each required table
    const tables = ['expenses', 'categories', 'tags', 'wallets', 'transfers', 'budgets'];
    
    for (const table of tables) {
      console.log(`Checking table: ${table}`);
      
      const { error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (error) {
        console.error(`❌ Error with table ${table}:`, error.message);
      } else {
        console.log(`✅ Table ${table} exists and is accessible`);
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkTables(); 