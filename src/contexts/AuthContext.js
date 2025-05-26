import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../utils/supabase';
import { initializeGlobalSyncManager } from '../utils/syncManager';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          // Clear any invalid session data
          await supabase.auth.signOut();
          setUser(null);
          initializeGlobalSyncManager(null);
        } else {
          const authenticatedUser = session?.user ?? null;
          setUser(authenticatedUser);
          initializeGlobalSyncManager(authenticatedUser);
        }
      } catch (error) {
        console.error('Session error:', error);
        setUser(null);
        initializeGlobalSyncManager(null);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        const authenticatedUser = session?.user ?? null;
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
          initializeGlobalSyncManager(null);
        } else if (event === 'SIGNED_IN') {
          setUser(authenticatedUser);
          initializeGlobalSyncManager(authenticatedUser);
        } else if (event === 'TOKEN_REFRESHED') {
          setUser(authenticatedUser);
          // Don't reinitialize sync manager on token refresh
        } else if (event === 'USER_UPDATED') {
          setUser(authenticatedUser);
          // Update sync manager with new user data
          initializeGlobalSyncManager(authenticatedUser);
        }
        
        // Handle token refresh errors
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('Token refresh failed, signing out user');
          await supabase.auth.signOut();
          setUser(null);
          initializeGlobalSyncManager(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://expense-tracker-cursor.vercel.app/dashboard'
        }
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      initializeGlobalSyncManager(null);
    } catch (error) {
      console.error('Sign out error:', error);
      // Force clear user state even if signOut fails
      setUser(null);
      initializeGlobalSyncManager(null);
    }
  };

  const resetPassword = async (email) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  };

  const updatePassword = async (password) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update password error:', error);
      throw error;
    }
  };

  // Helper function to check if user session is valid
  const isSessionValid = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      return !error && session && session.user;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  };

  // Helper function to refresh session manually
  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      setUser(data.session?.user ?? null);
      return data.session;
    } catch (error) {
      console.error('Manual session refresh failed:', error);
      await signOut();
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    isSessionValid,
    refreshSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 