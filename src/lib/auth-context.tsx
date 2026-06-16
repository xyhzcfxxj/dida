'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  getSessionToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  signOut: async () => {},
  getSessionToken: async () => null,
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const supabase = await getSupabaseBrowserClientWithRetry();
        
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
        }
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            setSession(newSession);
            setUser(newSession?.user ?? null);
            
            if (event === 'SIGNED_OUT') {
              router.push('/login');
            }
          }
        );
        
        setIsLoading(false);
        
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Auth init error:', error);
        setIsLoading(false);
      }
    };
    
    initAuth();
  }, [router]);

  const signOut = async () => {
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const getSessionToken = async (): Promise<string | null> => {
    if (!session?.access_token) {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      return currentSession?.access_token || null;
    }
    return session.access_token;
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      isAuthenticated: !!user,
      signOut,
      getSessionToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}