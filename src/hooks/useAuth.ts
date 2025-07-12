import { useState, useEffect } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import toast from 'react-hot-toast';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user;
      
      // Check if user email is verified
      if (user && !user.email_confirmed_at) {
        toast.error('Please verify your email address to continue');
        setUser(null);
      } else {
        setUser(user ? mapSupabaseUser(user) : null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      
      // Check if user email is verified
      if (user && !user.email_confirmed_at) {
        toast.error('Please verify your email address to continue');
        setUser(null);
      } else {
        setUser(user ? mapSupabaseUser(user) : null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email`,
      },
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };
}

function mapSupabaseUser(user: SupabaseUser): User {
  return {
    id: user.id,
    email: user.email!,
    displayName: user.user_metadata?.display_name,
  };
}