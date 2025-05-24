import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with your project credentials
const supabaseUrl = 'https://mplrakcyrohgkqdhzpry.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wbHJha2N5cm9oZ2txZGh6cHJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0NjQ4NTIsImV4cCI6MjA2MzA0MDg1Mn0.uPw-jom-Hsio1-yot4tJQ15FKrPxe0itLfyXPY-qREw';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials are missing. Please check your environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase; 