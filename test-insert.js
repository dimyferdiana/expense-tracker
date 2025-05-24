const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with your project credentials
const supabaseUrl = 'https://mplrakcyrohgkqdhzpry.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wbHJha2N5cm9oZ2txZGh6cHJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0NjQ4NTIsImV4cCI6MjA2MzA0MDg1Mn0.uPw-jom-Hsio1-yot4tJQ15FKrPxe0itLfyXPY-qREw';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  console.log('Testing Supabase insert...');
  
  try {
    // First, sign up a test user
    console.log('Creating a test user...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'test' + Date.now() + '@example.com',
      password: 'password123456',
    });
    
    if (authError) {
      console.error('Error creating test user:', authError);
      return;
    }
    
    console.log('Test user created:', authData.user.id);
    const userId = authData.user.id;
    
    // Now try to insert a wallet
    console.log('Inserting test wallet...');
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .insert([
        { 
          id: 'test-wallet-' + Date.now(),
          user_id: userId,
          name: 'Test Wallet',
          type: 'cash',
          balance: 100.00
        }
      ])
      .select();
    
    if (walletError) {
      console.error('Error inserting wallet:', walletError);
    } else {
      console.log('Wallet inserted successfully:', walletData);
    }
    
    // Try to insert a category
    console.log('Inserting test category...');
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .insert([
        {
          id: 'test-category-' + Date.now(),
          user_id: userId,
          name: 'Test Category'
        }
      ])
      .select();
    
    if (categoryError) {
      console.error('Error inserting category:', categoryError);
    } else {
      console.log('Category inserted successfully:', categoryData);
    }
    
  } catch (error) {
    console.error('Unexpected error during test:', error);
  }
}

testInsert(); 