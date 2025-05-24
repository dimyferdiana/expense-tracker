import supabase from './supabase';

// This file contains utility functions for debugging Supabase schema issues

/**
 * Check if a table exists and log its columns
 * @param {string} tableName - The name of the table to check
 * @returns {Promise<Object>} - The result of the check
 */
export const checkTableSchema = async (tableName) => {
  try {
    console.group(`Checking schema for table: ${tableName}`);
    
    // Get column information
    const { data: columns, error: columnError } = await supabase
      .rpc('get_table_columns', { table_name: tableName });
    
    if (columnError) {
      console.error('Error getting columns:', columnError);
      console.log('Trying fallback method...');
      
      // Try a simple query to check if table exists
      const { data, error } = await supabase
        .from(tableName)
        .select('count(*)', { count: 'exact', head: true });
      
      if (error) {
        console.error(`Table '${tableName}' access error:`, error);
        return { success: false, error };
      } else {
        console.log(`Table '${tableName}' exists, but could not get column information`);
        return { success: true, hasTable: true, columns: null };
      }
    }
    
    console.log(`Table '${tableName}' columns:`, columns);
    return { success: true, hasTable: true, columns };
  } catch (error) {
    console.error('Schema check error:', error);
    return { success: false, error };
  } finally {
    console.groupEnd();
  }
};

/**
 * Check if all required tables exist and have the correct schema
 * @returns {Promise<Object>} - The result of the check
 */
export const checkAllTables = async () => {
  const tables = ['expenses', 'categories', 'tags', 'wallets', 'transfers', 'budgets', 'recurring'];
  const results = {};
  
  console.group('Database Schema Check');
  
  for (const table of tables) {
    results[table] = await checkTableSchema(table);
  }
  
  console.log('Schema check complete', results);
  console.groupEnd();
  
  return results;
};

/**
 * Attempt to force a schema cache reload
 * @returns {Promise<Object>} - The result of the operation
 */
export const reloadSchemaCache = async () => {
  try {
    const { data, error } = await supabase.rpc('reload_schema_cache');
    
    if (error) {
      console.error('Error reloading schema cache:', error);
      return { success: false, error };
    }
    
    console.log('Schema cache reload requested', data);
    return { success: true, data };
  } catch (error) {
    console.error('Schema cache reload error:', error);
    return { success: false, error };
  }
};

// Export a convenient debug function
export const debugSupabase = {
  checkTable: checkTableSchema,
  checkAllTables,
  reloadCache: reloadSchemaCache
}; 